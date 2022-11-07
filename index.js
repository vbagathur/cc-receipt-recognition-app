let http = require('http');
let fs = require('fs');
let dotenv = require('dotenv').config();
let formidable = require('formidable');
const { url } = require('inspector');
const { AzureKeyCredential, DocumentAnalysisClient } = require("@azure/ai-form-recognizer");
const { queryRecord, insertRecord} = require('./cosmos-db-helper');


const formrecog_endpoint=process.env.FORM_RECOGNIZER_ENDPOINT;
const formrecog_key=process.env.FORM_RECOGNIZER_KEY;

async function recognizeReceipt(userId,receiptNo,targetFile) {
    // sample document
    const formUrl = process.env.IMAGE_BASE_URL + targetFile;

    const client = new DocumentAnalysisClient(formrecog_endpoint, new AzureKeyCredential(formrecog_key));

    const poller = await client.beginAnalyzeDocumentFromUrl("prebuilt-receipt", formUrl);

    try {

        const {
            documents: [result],
        } = await poller.pollUntilDone();

        // Use of PrebuiltModels.Receipt above (rather than the raw model ID), as it adds strong typing of the model's output
        if (result) {

            insertRecord(userId,receiptNo,result.fields);

            const { MerchantName, Items, Subtotal, TotalTax, Total } = result.fields;
            console.log("=== Receipt Information ===");
            console.log("Type:", result.docType);
            console.log("Merchant:", MerchantName && MerchantName.value);

            console.log("Items:");
            for (const item of (Items && Items.values) || []) {
            const { Description, TotalPrice } = item.properties;

            console.log("- Description:", Description && Description.value);
            console.log("  Total Price:", TotalPrice && TotalPrice.value);
            }

            console.log("Subtotal:", Subtotal && Subtotal.value);
            console.log("Tax:", TotalTax && TotalTax.value);
            console.log("Total:", Total && Total.value);
            
        } else {
            throw new Error("Expected at least one receipt in the result.");
        }
    }catch (e){
        console.log(e);
    }
}

http.createServer(function (req, res) {
  
  var reqUrl = req.url.replace(/^\/+|\/+$/g, '');

  //Create an instance of the form object
  let form = new formidable.IncomingForm();

  //Process the file upload in Node
  if (reqUrl === 'upload') {
    form.parse(req, async function (error, fields, file) {
            let filepth = '';

            const userId=fields["user-id"];
            const receiptNo=fields["receipt-no"];
            console.log("userId: "+userId);
            console.log("receiptNo: "+receiptNo);

            try {
                filepth = file.fileupload.filepath;
                console.log('file.fileupload.filepath'+filepth);
            }catch (e){
                console.log(e.message);
            }

            //Parameters validation
            if (userId.trim().length===0||receiptNo.trim().length===0||!file) {
                    res.write('File Upload Failed due to invalid parameters!');
                    res.end();
                    return;
            }

            //Allow only Valid User Ids - vish or bob
            if((userId!="vish" && userId!="bob")) {
                res.write('File Upload Failed due to invalid userid ('+userId+')');
                res.end();
                return;
            }

            try {

                const checkitems = await queryRecord(userId,receiptNo);
                if (checkitems && checkitems.length>0){
                    console.log("Warning: This receipt id already exists (receipt:"+receiptNo+") for (user:"+userId+")");
                    console.log("File Upload Cancelled");
                    res.write('File Upload Cancelled as this receipt id ('+receiptNo+') already exists!');
                    res.end();
                    return;
                } else {

                    const fileext = file.fileupload.originalFilename.split('.').pop();
                    const targetFilename = userId + '-' + receiptNo + '.' + fileext;
                    let newpath = process.env.FILE_UPLOAD_FOLDER + targetFilename;
    
                    //Copy the uploaded file to a custom folder
                    if (fs.existsSync(filepth)) {
                        fs.rename(filepth, newpath, function () {
                            //Send a File Upload confirmation message
                            res.write('File Upload Success! ('+newpath+')');
                            res.end();
                            return;
                        });

                        //recognize receipt
                        recognizeReceipt(userId,receiptNo,targetFilename).catch((error) => {
                            console.error("An error occurred:", error);
                            process.exit(1);
                        });
                    } else {
                        res.write('File Upload Failed!');
                        res.end();
                        return;
                    }
                }
            }catch (e){
                console.log(e.message);
            }
        });

    }
    //Process the file upload in Node
    else if (reqUrl === 'check-status') {
        form.parse(req, async function (error, fields) {
            let filepth = '';

            const userId=fields["user-id"];
            const receiptNo=fields["receipt-no"];
            console.log("userId: "+userId);
            console.log("receiptNo: "+receiptNo);

            //Parameters validation
            if (userId.trim().length===0||receiptNo.trim().length===0) {
                    res.write('Check Status Failed due to invalid parameters!');
                    res.end();
                    return;
            }

            //Allow only Valid User Ids - vish or bob
            if((userId!="vish" && userId!="bob")) {
                res.write('Check Status Failed due to invalid userid ('+userId+')');
                res.end();
                return;
            }

            const queriedItems = await queryRecord(userId,receiptNo);
            if (queriedItems && queriedItems.length<1){
                console.log("Warning: This receipt id does not exist (receipt:"+receiptNo+") for (user:"+userId+")");
                console.log("Check Status Cancelled");
                res.write('Check Status Cancelled as this receipt id ('+receiptNo+') does not exist!');
                res.end();
                return;
            }else {
                // console.log(queriedItems[0]);
                const trxDetails = 'MerchantName    : '+queriedItems[0]["receiptObj"]["MerchantName"]["value"] + '\n' +
                'Items 1         : '+queriedItems[0]["receiptObj"]["Items"]["values"][0]["content"] + '\n' +
                'Items 2         : '+queriedItems[0]["receiptObj"]["Items"]["values"][1]["content"] + '\n' +
                'Subtotal        : '+queriedItems[0]["receiptObj"]["Subtotal"]["value"] + '\n' +
                'TotalTax        : '+queriedItems[0]["receiptObj"]["TotalTax"]["value"] + '\n' +
                'Total           : '+queriedItems[0]["receiptObj"]["Total"]["value"] + '\n' +
                'TransactionDate : '+queriedItems[0]["receiptObj"]["TransactionDate"]["value"] + '\n' +
                'TransactionTime : '+queriedItems[0]["receiptObj"]["TransactionTime"]["value"];
                console.log(trxDetails);
                res.write("Check Status\n\n" +trxDetails);
                res.end();
            }
        });
    }

}).listen(8080);