/**
 * This is a Google Cloud Function.   
 *
 * For more information on GCFs, see https://cloud.google.com/functions/
 *
 * When an image is added to Google Cloud Storage and triggers this GCF, 
 * this SHOULD tell ImageMagick to extract the EXIF and IPTC metadata,
 * but I broke it and it's not yet working again.
 */
'use strict';

const http = require('http');
const im = require('imagemagick');
const gcs = require('@google-cloud/storage')();
const exec = require('child-process-promise').exec;
const LOCAL_TMP_FOLDER = '/tmp/';

/**
 * Google Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} The callback function.
 */
exports.helloGCS = function helloGCS (event, callback) {
	// The structure of the event parameter is described here:
	// https://cloud.google.com/functions/docs/writing/background
	//console.log('Event type: ', event.eventType);
	//console.log('Event resource: ', event.resource);

	// The event.data is Google Cloud Storage Objects resource as described here:
	// https://cloud.google.com/storage/docs/json_api/v1/objects#resource
	const file = event.data;
	
	if (file.name === undefined) {
		console.log('Got an undefined file.  Ignoring.');
		callback();
		return;
	}

	const filePath = file.name;
	const fileName = filePath.split('/').pop();
	const isDelete = file.resourceState === 'not_exists';

	// Stop if file was deleted
	// We only care about added or modified files
	if (isDelete) {
		console.log(`Yo! File ${file.name} deleted.`);
		callback();
		return;
	} 

	console.log(`File ${file.name} uploaded. It's of type: ${file.contentType}`);
	//console.log("File resource state: ", file.resourceState);

	const isImage = file.contentType.startsWith('image/');
	if (!isImage) {
		console.log('File is not an image, ignoring.')
		callback();
		return;
	}

	//console.log("File metadata: " + file.metadata);

	// Get the image's EXIF and IPTC metadata from the blitline image processing service

	console.log("Sending job to Blitline ", blitline_job_data);

    var request_options = {
        host: 'api.blitline.com',
        port: 80,
        method:"POST",
        path: '/job'
    };

    // The Blitline job data that we'll be POSTing to them
	var blitline_job_data = {
	    "application_id": "7hZLs3W6e4VVWTec0XksLoQ",
	    "src": encodeURIComponent(file.mediaLink),
	    "v": 1.21,
	    "postback_url": "https://us-central1-cloud-functions-test-1.cloudfunctions.net/imageMetadata",
	    "pre_process":
	    {
	        "peek": true
	    }
	};

    var req = http.request(request_options, function(res) {
    	var responseBody = '';

        res.on('data', function(chunk) {
            responseBody += chunk;
        });

		res.on('end', function() {
	    	if (res.statusCode !== 200) {
	    		console.log("Error: ", responseBody);
	    	}
	    	else  {
		    	var blitlineResponseObj = JSON.parse(responseBody);
	            // console.log("Blitline response: ", blitlineResponseObj);
				if (blitlineResponseObj.results.error) {
	            	console.log('Error submitting job to Blitline: ', blitlineResponseObj.results.error)
	            }
	            else {
	            	console.log('Success sumitting job to Blitline: ', blitlineResponseObj.results);
	            }
	    	}
		});

    }).on('error', function(e) {
        console.log("Error connecting to Blitline: " + e.message);
    });

    req.write("json="+ JSON.stringify(blitline_job_data));
    req.end();

	// Return success
	callback();
};

/**
 * OBSOLETE -- NOT USED
 *
 * Extract image metadata using ImageMagick
 */
function extractMetadata(file) {
	const filePath = file.name;
	const fileName = filePath.split('/').pop();
	const tempLocalFile = `${LOCAL_TMP_FOLDER}${fileName}`;
	console.log('Downloading image from bucket to temp file: ', tempLocalFile);

	// Download image from bucket
	const bucket = gcs.bucket(file.bucket);

	// console.log('Bucket: ', bucket);

	bucket.file(filePath).download({destination: tempLocalFile}).then(() => {
		console.log('Image is downloaded from bucket');

		// Get metadata from image.
		exec(`identify -format "Keywords %[IPTC:2:25] Headline %[IPTC:2:105] Title %[IPTC:2:05] Caption %[IPTC:2:120]" "${tempLocalFile}"`)
			.then(function (result) {
				var stdout = result.stdout;
        		var stderr = result.stderr;
				console.log('Metadata: ', stdout);
				console.log('stderr: ', stderr);
			})
		    .catch(function (err) {
		        console.error('ERROR: ', err);
		    });
	});
}