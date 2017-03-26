/**
 * This is a Google Cloud Function.  
 * 
 * For more information on GCFs, see https://cloud.google.com/functions/
 */
'use strict';

/**
 * Google Cloud Function to be triggered when its HTTP endpoint is hit.
 * 
 * My other GCF will call Blitline to get the image processed and register 
 * this function's HTTP endpoint as the callback.  Blitline calls this with 
 * the image's metadata.
 *
 * The request contains JSON in Blitline's callback format, documented here:
 * http://docs.blitline.com/articles/metadata.html
 *
 * @param {Object} req Cloud Function request context
 * @param {Object} res Cloud Function response context
 */
exports.imageMetadata = function imageMetadata (req, res) {
	// console.log("Request: ", req);
	// console.log("Request body: ", req.body);
	// console.log("Request body results: ", req.body.results);
	// console.log("Request body results originalMeta: ", req.body.results.original_meta.original_exif);
	// console.log("Request body results preprocessor results: ", req.body.results.pre_processor_results);

	if (!req.body.results) {
		console.log("Expected the request to contain JSON with a 'results' property, but instead got: ", req.body);
	}
	else if (!req.body.results.original_meta) {
		console.log("Expected the request to contain JSON with a 'results.original_meta' property, but instead got: ", req.body.results);
	}
	else if (!req.body.results.original_meta.original_exif) {
		console.log("Expected the request to contain JSON with a 'results.original_meta.original_exif' property, but instead got: ", req.body.results.original_meta);
	}
	else {
		// Got the original_exif property we were expecting.
		// It should contain the image's EXIF and IPTC metadata
		const md = req.body.results.original_meta.original_exif;

		console.log(`Image Title: ${md.Title}.  Description: ${md.Description}`);
	}

	// Return 200 OK and nothing else; Blitline isn't going to read it anyway
	res.status(200).end();
};

// Some of the many property names Blitline sends:
// Description: 'Some test description'
// Subject: [ 'some', 'test', 'keyword' ]
// Title: 'Some Test Title'
// FileSize: '323 kB'
// FileModifyDate: '2017-03-25 23:44:56 +0000'
// FileAccessDate: '2017-03-25 23:44:56 +0000'
// FileType: 'PNG'
// FileTypeExtension: 'png'
// MIMEType: 'image/png'
// ImageWidth: 990
// ImageHeight: 980
// ExifImageWidth: 990
// ExifImageHeight: 980
// MetadataDate: '2017-03-25 17:12:49 -0400'
// Headline: 'Some Test Headline'
// City: 'Bethesda'
// State: 'MD'
// Country: 'USA', 
// CountryCode: 'USA'
// UsageTerms: 'All rights reserved. May not be reproduced, stored, transmitted, or disseminated in any form or by any means without prior written permission from either Dean or Lucie Moses.', 
// Rights: '©2017 Dean and Lucie Moses, all rights reserved