/**
 * This is a Google Cloud Function.   
 *
 * For more information on GCFs, see https://cloud.google.com/functions/
 *
 * When a folder or image is added to Google Cloud Storage and triggers this GCF, 
 * this attempts to figure out whether it was an image or folder, and to detect 
 * whether the event is an addition, deletion, modification or rename.
 */
'use strict';

const http = require('http');

/**
 * Google Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} The callback function.
 */
exports.helloGCS = function helloGCS (event, callback) {
	// The structure of the event parameter is described here:
	// https://cloud.google.com/functions/docs/writing/background

	// The event.data is Google Cloud Storage Objects resource as described here:
	// https://cloud.google.com/storage/docs/json_api/v1/objects#resource
	const file = event.data;
	
	if (file.name === undefined) {
		console.log('Got an undefined file.  Ignoring.');
		console.log(`Undeflined files is of type: ${file.contentType}`);
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

	console.log('Event type: ', event.eventType);
	console.log('Event resource: ', event.resource);

	console.log(`File ${file.name} uploaded. It's of type: ${file.contentType}`);
	console.log('File resource state: ', file.resourceState);
	console.log('File generation: ', file.generation);
	console.log('File metageneration: ', file.metageneration);
	console.log('File metadata: ', file.metadata);
	
	const isImage = file.contentType.startsWith('image/');
	if (isImage) {
		console.log('File is an image')
	}

	// Return success
	callback();
};