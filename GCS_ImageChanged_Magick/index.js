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
const LOCAL_TMP_FOLDER = '/tmp/'; // folder the image is downloaded to for ImageMagick to process it

/**
 * Google Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} The callback function.
 */
exports.processImageWithMagick = function processImageWithMagick(event, callback) {
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

	// Extract the image's EXIF and IPTC metadata using ImageMagick

	const LOCAL_TMP_FILE = `${LOCAL_TMP_FOLDER}${fileName}`;
	console.log('Downloading image from bucket to temp file: ', LOCAL_TMP_FILE);

	// Download image from bucket
	const bucket = gcs.bucket(file.bucket);

	console.log('Bucket: ', bucket);

	bucket.file(filePath).download({destination: LOCAL_TMP_FILE}).then(() => {
		console.log('Image is downloaded from bucket');

		// Extract metadata from image
		exec(`identify -format "Keywords %[IPTC:2:25] Headline %[IPTC:2:105] Title %[IPTC:2:05] Caption %[IPTC:2:120]" "${LOCAL_TMP_FILE}"`)
			.then(function (result) {
				console.log('Getting result from ImageMagick');
				var stdout = result.stdout;
        		var stderr = result.stderr;
				console.log('Metadata: ', stdout);
				console.log('ImageMagick stderr: ', stderr);
			})
			.progress(function (childProcess) {
			 	console.log('childProcess.pid: ', childProcess.pid);
			 })
			 .fail(function (err) {
			 	console.log('ERROR: ', err);
			 })
		    .catch(function (err) {
		        console.log('Error with ImageMagick: ', err);
		    });
	});

	// Return success
	callback();
};