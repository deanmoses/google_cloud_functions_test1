/**
 * This is a Google Cloud Function.   When an image is added to Google Cloud Storage 
 * and triggers this Cloud Function, it uses Cloud Function's built-in imagemagick 
 * to read the image's EXIF metadata.
 */
'use strict';

const im = require('imagemagick');
const gcs = require('@google-cloud/storage')();
const exec = require('child-process-promise').exec;
const LOCAL_TMP_FOLDER = '/tmp/';

/**
 * Background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} The callback function.
 */
exports.helloGCS = function helloGCS (event, callback) {
	// The structure of the event parameter is described here:
	// https://cloud.google.com/functions/docs/writing/background
	//console.log('Event type: ', event.eventType);
	//console.log('Event resource: ', event.resource);

	// The event.data is an Objects resource as described here:
	// https://cloud.google.com/storage/docs/json_api/v1/objects#resource
	const file = event.data;
	
	if (file.name === undefined) {
		console.log('Got one of those weird undefined files I get during function deployment.  Ignoring.');
		return;
	}

	const filePath = file.name;
	const fileName = filePath.split('/').pop();
	const tempLocalFile = `${LOCAL_TMP_FOLDER}${fileName}`;
	const isDelete = file.resourceState === 'not_exists';

	// Stop processing if the file was deleted
	// We only care about added or modified files
	if (isDelete) {
		console.log(`Yo! File ${file.name} deleted.`);
		return;
	} 

	console.log(`Yo! File ${file.name} uploaded. It is of type: `, file.contentType);
	console.log("File resource state: ", file.resourceState);

	const isImage = file.contentType.startsWith('image/');
	if (!isImage) {
		console.log('File is not an image, ignoring.')
		return;
	}

	//console.log("File metadata: " + file.metadata);

	// Get the image metadata from blitline
	var blitline_job_data = {
	    "application_id": "7hZLs3W6e4VVWTec0XksLoQ",
	    "src": "https://00e9e64bac5a7146feed4f36176dca28613b58a6cf62cb6fd3-apidata.googleusercontent.com/download/storage/v1/b/cloud-functions-test1-upload/o/gcf-test1.png?qk=AD5uMEuBzVuL8ENGUB6kbDB4bQ7xqjwL7-UyGM3_HWcywC4ypNZ25YFsU79kpNURfProFNguwnaw0tDENu0OE0CMtzHb5RKbm1GbStgY0lj89s8F_b6ZsOi7DR5V4qe6ZUeOBCyBK3HZ42ZfBETbvdo9eZssKcgqo_4WvRCu7j8eJ6wzsA5RRLk61uEiQ6poq8RStX-ttBs1Ym0QKddBjQWSLzMgoyxHxYcx-S5NKk7DC0Q3ncmEfWehfafOXDF712mdA8SgMrmMmD5rnavTnNxkH8_1Tb6ivz5bMIhdnfTFfwDb1rrtnQXqasCJsj6Obn-QJZr_NVh-oueXtQf568PZTt0tH1mheqbLfG9dKaWwGeE1kv4RmbAUUghDS-5Qb2J1R081g09xh4IDLJqRxlebT5AyFltSDTYiz34KQoCjVabNRdOw3wfd4rJX_rKCAHlZRFjm1tSFNkxxQWI72RrB7VjChdIPznM77pZSUhEsTjl-sy94V6iWxdCMLCX7IMe1tZiMmcQnrKa_MmDkmzNb-F3F4OTBQhyzXZDoEGEGYCtqRiAxo4GVT6QVbydd2zBg6lwiBAmA7Cr-nXEob5dYECwuZ3tmb7zv7E2oGNQN1Z-pT_7jj8y31DLbAJDahyROiuMmogt-RY_zfLOy4d5ik3uU9bmPR0sg3zMVyP3pytc7xJlCOONP8xAyQSBfDvCMAifmeCeUqGtggq8aklAlftG2TCnYPJ_2TyujFKV6ud-JlMOJlHZddSwuae3bg9mTy_cpOH8ssiaKu9uxDVsZRjN0e7XsEUUGVKx076e_vcWw3fyYaRs",
	    "v" : 1.21,
	    "pre_process":
	    {
	        "peek": true
	    }
	};

	sendHttpPostToBlitline(blitline_job_data);

	return;

	console.log('Downloading image from bucket to: ', tempLocalFile);

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

	// Return success.  Could also have just ended with no callback
	callback();
};



/**
 * Function to post an image processing job to Blitline
 */
function sendHttpPostToBlitline(job_data) {
    var http = require('http');

    var options = {
        host: 'api.blitline.com',
        port: 80,
        method:"POST",
        path: '/job'
    };

    var req = http.request(options, function(res) {
            res.on("data", function(chunk) {
            //console.log("Blitline response data", chunk);

            var blitlineResponseObj = JSON.parse(chunk);

            console.log("Response object: ", blitlineResponseObj);

            //console.log(typeof chunk);

   //          for(var propertyName in chunk) {
   //          	console.log("property: ", propertyName, " value: ", chunk[propertyName]);
			// }

            var job_id = blitlineResponseObj.results.job_id;

            console.log('got my job ID: ', job_id);

            var options = {
			  host: 'cache.blitline.com',
			  port: 80,
			  path: '/listen/'+job_id
			};

			http.get(options, function(res) {
			  res.on("data", function(chunk) {
			    console.log("Data=" + chunk);
			  });
			})
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });

    req.write("json="+ JSON.stringify(job_data));
    req.end();
}
