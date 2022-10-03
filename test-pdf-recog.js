let http = require('http');
let fs = require('fs');
let formidable = require('formidable');
const { url } = require('inspector');
const { AzureKeyCredential, DocumentAnalysisClient } = require("@azure/ai-form-recognizer");

// sample document
const formUrl = "https://raw.githubusercontent.com/Azure-Samples/cognitive-services-REST-api-samples/master/curl/form-recognizer/sample-layout.pdf";

const formrecog_endpoint="https://vishformrecognizer.cognitiveservices.azure.com/";
const formrecog_key="03114a76344d4784839461a3c6f0923a";

async function main() {
    const client = new DocumentAnalysisClient(formrecog_endpoint, new AzureKeyCredential(formrecog_key));

    const poller = await client.beginAnalyzeDocumentFromUrl("prebuilt-layout", formUrl);

    const {
        pages,
        tables
    } = await poller.pollUntilDone();

    if (pages.length <= 0) {
        console.log("No pages were extracted from the document.");
    } else {
        console.log("Pages:");
        for (const page of pages) {
            console.log("- Page", page.pageNumber, `(unit: ${page.unit})`);
            console.log(`  ${page.width}x${page.height}, angle: ${page.angle}`);
            console.log(`  ${page.lines.length} lines, ${page.words.length} words`);
        }
    }

    if (tables.length <= 0) {
        console.log("No tables were extracted from the document.");
    } else {
        console.log("Tables:");
        for (const table of tables) {
            console.log(
                `- Extracted table: ${table.columnCount} columns, ${table.rowCount} rows (${table.cells.length} cells)`
            );
        }
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