const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const cors = require('cors');
const { receiveMessageOnPort } = require('worker_threads');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: ['http://localhost:3000', 'https://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
console.log("Azure", AZURE_STORAGE_CONNECTION_STRING)
const dataHere = upload
console.log('upload', dataHere);

'recordings', 'upload', 'data', AZURE_STORAGE_CONNECTION_STRING

console.log('Upload Multer', upload, dataHere, AZURE_STORAGE_CONNECTION_STRING, receiveMessageOnPort)
const CONTAINER_NAME = 'recordings';
const AUDIO_CONTAINER_NAME = 'audio-recordings';

app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    // Generate unique blob name
    const blobName = `${Date.now()}-${req.file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });

    const blobUrl = blockBlobClient.url;
    console.log('Uploaded blob URL:', blobUrl);
    console.log('Uploaded filename:', blobName);
    res.json({ url: blobUrl, filename: blobName });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Upload failed: ' + err.message);
  }
});

app.get('/videos/:filename', async (req, res) => {
  const blobName = req.params.filename;
  console.log('--- Video Request Debug ---');
  console.log('Requested filename:', blobName);
  console.log('Container name:', CONTAINER_NAME);
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    console.log('Blob exists:', exists);
    if (!exists) {
      console.error('Blob does not exist:', blobName);
      return res.status(404).send('Video not found');
    }

    // Download the blob
    const downloadBlockBlobResponse = await blockBlobClient.download();
    res.setHeader('Content-Type', downloadBlockBlobResponse.contentType || 'video/webm');
    downloadBlockBlobResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error('Video fetch error:', err);
    res.status(500).send('Server error: ' + err.message);
  }
});

//Audio
app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No audio file uploaded.');
    // ... rest of your code
  } catch (err) {
    if (err instanceof multer.MulterError) {
      // Handle Multer errors specifically
      console.error('Multer error:', err);
      return res.status(400).send(`File upload error: ${err.message}`);
    }
    console.error('Audio upload error:', err);
    res.status(500).send('Audio upload failed: ' + err.message);
  }
});

app.get('/audio/:filename', async (req, res) => {
  const blobName = req.params.filename;
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(AUDIO_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const exists = await blockBlobClient.exists();
    if (!exists) return res.status(404).send('Audio not found');

    const downloadBlockBlobResponse = await blockBlobClient.download();
    res.setHeader('Content-Type', downloadBlockBlobResponse.contentType || 'audio/mpeg');
    downloadBlockBlobResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error('Audio fetch error:', err);
    res.status(500).send('Server error: ' + err.message);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

