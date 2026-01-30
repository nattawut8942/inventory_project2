import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'test_image.txt');
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'test content');
}

const form = new FormData();
form.append('file', fs.createReadStream(filePath));

(async () => {
    try {
        const response = await axios.post('http://localhost:3002/api/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        console.log('Upload response:', response.data);
    } catch (error) {
        console.error('Upload failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
})();
