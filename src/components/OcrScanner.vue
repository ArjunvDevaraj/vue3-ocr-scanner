<template>
    <div
        class="min-h-screen bg-gradient-to-b from-gray-100 to-gray-300 bg-[url('https://www.transparenttextures.com/patterns/newsprint.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] bg-repeat text-gray-900 dark:text-green-300 font-mono">
        <div class="p-6 max-w-3xl mx-auto backdrop-blur-md bg-white/80 dark:bg-black/80 shadow-2xl rounded-xl mt-10 border border-gray-300 dark:border-gray-700"
            @dragover.prevent @drop.prevent="handleDrop">
            <div class="mb-6">
                <label for="upload" class="block text-xl font-bold text-gray-900 dark:text-green-300 mb-3">
                    📄 Upload Document Image or Drag & Drop
                </label>
                <input type="file" id="upload" accept="image/*" @change="handleUpload"
                    class="block w-full text-sm text-green-800 file:mr-4 file:py-2 file:px-4 file:border file:border-green-500 file:rounded-lg file:text-sm file:font-semibold file:bg-green-50 hover:file:bg-green-100 dark:file:bg-gray-800 dark:file:border-green-300 dark:file:text-green-200" />
            </div>


            <!-- Preview with scanning animation -->
            <div v-if="previewImage && loading"
                class="relative mt-6 max-w-full border rounded overflow-hidden shadow-lg">
                <div class="relative w-full h-auto bg-black/90">
                    <img :src="previewImage" alt="Preview" class="w-full max-h-[600px] object-contain" />
                    <div class="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
                        <!-- Vertical animated scan line -->
                        <div
                            class="absolute w-full h-1 bg-gradient-to-r from-green-300 via-green-500 to-green-300 animate-scan-line">
                        </div>
                    </div>
                </div>
            </div>


            <div v-if="loading" class="text-purple-500 font-bold mb-4 animate-pulse mt-4">🔍 {{ loading }}</div>

            <canvas ref="canvas" class="hidden"></canvas>

            <div v-if="result"
                class="bg-white/70 dark:bg-gray-900/70 border border-green-400 rounded-xl p-6 mt-4 shadow-md">
                <p class="text-green-700 dark:text-green-300 font-bold text-lg mb-2">✅ Text Extraction Successful</p>
                <p class="text-sm text-gray-700 dark:text-gray-400 mb-4">Here is the extracted content:</p>

                <ul class="list-disc list-inside text-gray-900 dark:text-green-200 space-y-2">
                    <li v-for="(line, i) in result.lines" :key="'line-' + i">📜 {{ line }}</li>
                </ul>

                <div class="mt-6 space-x-4">
                    <button @click="copyToClipboard"
                        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">📑 Copy</button>
                    <button @click="downloadText"
                        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">📄 Download TXT</button>
                    <button @click="downloadPDF"
                        class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">📋 Save PDF</button>
                </div>

                <details class="mt-6 text-sm">
                    <summary class="cursor-pointer text-blue-700 dark:text-blue-400 hover:underline font-medium">🗂 View
                        Raw Data</summary>
                    <pre
                        class="mt-3 text-xs text-gray-800 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 p-3 rounded-lg whitespace-pre-wrap">
  {{ result.raw }}
            </pre>
                </details>
            </div>

            <div v-if="error" class="text-red-600 font-semibold mt-4">❌ {{ error }}</div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';

const canvas = ref(null);
const loading = ref('');
const error = ref('');
const result = ref(null);
const previewImage = ref(null);

function enhanceImage(file, cb) {
    const img = new Image();
    img.onload = () => {
        const scale = 2;
        const c = canvas.value;
        c.width = img.width * scale;
        c.height = img.height * scale;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);

        const imageData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
            let avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            avg = (avg - 128) * 1.25 + 128 + 15;
            avg = Math.min(Math.max(avg, 0), 255);
            d[i] = d[i + 1] = d[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        cb(c.toDataURL());
    };

    const reader = new FileReader();
    reader.onload = e => {
        img.src = e.target.result;
        previewImage.value = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    processFile(file);
}

function handleDrop(e) {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    processFile(file);
}

function processFile(file) {
    error.value = '';
    result.value = null;
    loading.value = 'Enhancing image...';

    enhanceImage(file, function (dataUrl) {
        loading.value = 'Running OCR analysis...';

        Tesseract.recognize(dataUrl, 'eng')
            .then(({ data: { text } }) => {
                const cleanLines = text
                    .split('\n')
                    .map(line => line.replace(/[^\x20-\x7E]/g, '').trim())
                    .filter(line => line.length > 0);

                result.value = {
                    lines: cleanLines,
                    raw: text.trim()
                };
                loading.value = '';
            })
            .catch(err => {
                error.value = 'Error processing image: ' + err;
                loading.value = '';
            });
    });
}

function copyToClipboard() {
    if (result.value?.raw) {
        navigator.clipboard.writeText(result.value.raw);
    }
}

function downloadText() {
    if (!result.value?.raw) return;
    const blob = new Blob([result.value.raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-output.txt';
    a.click();
    URL.revokeObjectURL(url);
}

function downloadPDF() {
    if (!result.value?.raw) return;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(result.value.raw, 180);
    doc.text(lines, 10, 10);
    doc.save('ocr-output.pdf');
}
</script>

<style scoped>
canvas {
    display: none;
}

@keyframes scanLine {
    0% {
        top: 0%;
    }

    100% {
        top: 100%;
    }
}

.animate-scan-line {
    animation: scanLine 2.5s linear infinite;
}
</style>