const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const dotenv = require('dotenv');
const axios = require('axios');
const MdFiles = require('./mdfiles');

const app = express();

// Load environment variables from .env file
dotenv.config();

const accessToken = process.env.ACCESS_TOKEN;
const mongodbUri = process.env.MONGODB_URI;

const base64ToText = (base64Data) => {
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer.toString('utf-8');
};

const extractData = (dataString) => {
    const regex = /---\n([\s\S]*?)\n---/;
    const match = regex.exec(dataString);
    if (match) {
        const extractedDataString = match[1];
        const extractedDataRegex = /(\w+):\s*(.*)/g;
        let extractedData = {};
        let matchArr;

        while ((matchArr = extractedDataRegex.exec(extractedDataString)) !== null) {
            const key = matchArr[1].toLowerCase();
            const value = matchArr[2];
            extractedData[key] = value;
        }

        return extractedData;
    }
    return null;
};


const getallinfo = async () => {
    try {
        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };

        const response = await axios.get('https://api.github.com/repos/ethereum/EIPs/contents/EIPS', { headers });
        const allinfo = response.data;
        let count = 1;

        for (const obj of allinfo) {
            const url = obj.url;
            const result = await axios.get(url, { headers });
            const resultContent = base64ToText(result.data.content);

            let extractedData = extractData(resultContent);
            if (Object.keys(extractedData).length === 0) {
                const regex = /EIP:\s*(\d+)\nTitle:\s*(.*?)\nAuthor:\s*(.*?)\nTo:\s*(.*?)\nType:\s*(.*?)\nCategory:\s*(.*?)\nStatus:\s*(.*?)\nDeadline:\s*(.*?)\nCreated:\s*(.*?)\nRequires:\s*(.*)/i;
                const [, eip, title, author, type, category, status, created, to, deadline, requires] = regex.exec(resultContent);

                extractedData = {
                    eip,
                    title,
                    author,
                    type,
                    category,
                    status,
                    created,
                    to,
                    deadline,
                    requires,
                };
            }

            const [year, month, date] = extractedData.created.split("-");
            const newcreateddate = new Date(year, month - 1, date);

            try {

                if (extractedData.category == 'Standard Track') {
                    extractedData.category = 'Standards Track'
                }
                else if (extractedData.category == 'core') {
                    extractedData.category = 'Core'
                }
                else if (extractedData.category == 'standard Track') {
                    extractedData.category = 'Standards Track'
                }
                else if (extractedData.category == 'standard Track') {
                    extractedData.category = 'Standards Track'
                }
                else if (extractedData.category == 'standard') {
                    extractedData.category = 'Standards Track'
                }
                else if (extractedData.category == 'Standard') {
                    extractedData.category = 'Standards Track'
                }
                else if (extractedData.category == 'meta') {
                    extractedData.category = 'Meta'
                }

                const filter = { eip: extractedData.eip };
                const update = {
                    eip: extractedData.eip || '',
                    title: extractedData.title || '',
                    author: extractedData.author || '',
                    status: extractedData.status || '',
                    type: extractedData.type || '',
                    category: extractedData.category || extractedData.type,
                    created: newcreateddate || 'undefined',
                    requires: extractedData.requires || '',
                    discussion: extractedData.to || '',
                    deadline: extractedData.deadline || '',
                    unique_ID: count || null,
                };

                const options = { upsert: true, new: true };

                const updatedMdFile = await MdFiles.findOneAndUpdate(filter, update, options);
                console.log(updatedMdFile);
                count++;
                console.log('Data saved successfully.');
                console.log('Count:', count);
            } catch (error) {
                console.log('Error:', error);
            }
        }
    } catch (error) {
        console.log('Error:', error);
    } finally {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    }
};


// Schedule the task to run every 2 hours (0 */2 * * *)
cron.schedule('0 */2 * * *', async () => {
    console.log('Running the task...');
    try {
        // Connect to MongoDB
        await mongoose.connect(mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to the database');
        await getallinfo();
    } catch (error) {
        console.log('Error:', error);
    } finally {
        mongoose.disconnect();
        console.log('Disconnected from the database');
    }
});

// Connect to MongoDB
mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to the database');
        getallinfo();
        // You can call the getallinfo() here as well if you want to run it once at the start
    })
    .catch((error) => {
        console.log('Error connecting to the database:', error);
    });

// Set up a simple route to check if the server is running
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
