let http = require('http');
let fs = require('fs');
let dotenv = require('dotenv').config();
let formidable = require('formidable');
const { url } = require('inspector');
const { AzureKeyCredential, DocumentAnalysisClient } = require("@azure/ai-form-recognizer");

// sample document
const formUrl = "https://github.com/MicrosoftLearning/AI-900-AIFundamentals/raw/main/data/vision/receipt.jpg";

const formrecog_endpoint=process.env.FORM_RECOGNIZER_ENDPOINT;
const formrecog_key=process.env.FORM_RECOGNIZER_KEY;

async function main() {
    const client = new DocumentAnalysisClient(formrecog_endpoint, new AzureKeyCredential(formrecog_key));

    const poller = await client.beginAnalyzeDocumentFromUrl("prebuilt-receipt", formUrl);

    try {

        const {
            documents: [result],
        } = await poller.pollUntilDone();

        // Use of PrebuiltModels.Receipt above (rather than the raw model ID), as it adds strong typing of the model's output
        if (result) {

            console.log("=== Receipt Information ===");
            console.log("Type:", result.docType);
            console.log("Merchant:", result.fields.MerchantName && result.fields.MerchantName.value);

            console.log("Items:");
            for (const item of (result.fields.Items && result.fields.Items.values) || []) {
            const { description, totalPrice } = item.properties;

            console.log("- Description:", item.properties.Description && item.properties.Description.value);
            console.log("  Total Price:", item.properties.TotalPrice && item.properties.TotalPrice.value);
            }

            console.log("Subtotal:", result.fields.Subtotal && result.fields.Subtotal.value);
            console.log("Tax:", result.fields.TotalTax && result.fields.TotalTax.value);
            console.log("Total:", result.fields.Total && result.fields.Total.value);
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
    form.parse(req, function (error, fields, file) {
            let filepth = '';

            try {

                filepth = file.fileupload.filepath;
                console.log('file.fileupload.filepath'+filepth);
            }catch (e){
                console.log(e.message);
            }

            try {

                let newpath = 'C:/temp/cc-file-uploads/';
                newpath += file.fileupload.originalFilename;

                //Copy the uploaded file to a custom folder
                if (fs.existsSync(filepth)) {
                    fs.rename(filepth, newpath, function () {
                        //Send a NodeJS file upload confirmation message
                        res.write('NodeJS File Upload Success! ('+newpath+')');
                        res.end();
                    });
                } else {
                    res.write('NodeJS File Upload Failed!');
                    res.end();
                }
            }catch (e){
                console.log(e.message);
            }
        });

    }
    //Process the file upload in Node
    else if (reqUrl === 'check-status') {

        main().catch((error) => {
            console.error("An error occurred:", error);
            process.exit(1);
        });

        res.write('Checking status!');
        res.end();
    }

}).listen(80);