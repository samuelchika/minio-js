const express = require('express');
const multer = require('multer');
const Minio = require('minio');
const path = require('path');

const app = express();
const port = 3000;

// Configure Multer for file storage in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize MinIO client
const minioClient = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'wNXwX2C67wlc3xsnbq6Y',
    secretKey: 'ZoU4qDPQMNnVSViZ7FrxdnAqzuzyoMzi1rPGwacn',
});

// Ensure the bucket exists
const bucketName = 'images';
minioClient.bucketExists(bucketName, (err) => {
    if (err && err.code === 'NoSuchBucket') {
        minioClient.makeBucket(bucketName, (err) => {
            if (err) console.log('Error creating bucket:', err);
            else console.log('Bucket created successfully.');
        });
    }
});
console.log(bucketName);

// API endpoint for uploading images
app.post('/upload', upload.single('image'), async (req, res) => {
    console.log('Uploading image');
    const file = req.file;
    console.log(file);
    const metaData = {
        'Content-Type': file?.mimetype,
    };
    const mimetype = file?.mimetype.split('/')[1];
    const imageName = `${Date.now()}${
        (Math.random() * 1000000000000000).toString().split('.')[0]
    }.${mimetype}`;
    console.log(imageName);
    const uploaded = await minioClient.putObject(
        bucketName,
        imageName,
        file?.buffer,
        metaData,
        (err, etag) => {
            if (err) {
                console.log('Error uploading file:', err);
                return res.status(500).send('Error uploading file.');
            }
            console.log('File uploaded successfully:', etag);
            res.send(
                `Image uploaded successfully. URL: http://localhost:3000/images/${imageName}`
            );
        }
    );

    console.log(uploaded);
});

// API endpoint for serving images
app.get('/images/:filename', (req, res) => {
    const filename = req.params.filename;
    minioClient.presignedUrl(
        'GET',
        bucketName,
        filename,
        24 * 60 * 60,
        (err, url) => {
            if (err) {
                console.log('Error getting presigned URL:', err);
                return res.status(500).send('Error getting image.');
            }
            res.redirect(url);
        }
    );
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
