const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

class AI {
    /**
     * @param {Object} options
     * @param {"gemini" | "openaiLike"} options.type
     * @param {string} options.apiKey
     * @param {string} options.model
     * @param {boolean} [options.streaming=false]
     * @param {string} [options.baseURL]
     */
    constructor({ type, apiKey, model, streaming = false, baseURL }) {
        if (!apiKey) {
            throw new Error(`AI Constructor: API Key is missing for provider ${type}`);
        }
        this.type = type;
        this.modelName = model;
        this.streaming = streaming;

        if (this.type === 'gemini') {
            this.client = new GoogleGenAI({ apiKey });
        }
        else if (this.type === 'openaiLike') {
            this.client = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL || 'https://api.openai.com/v1'
            });
        }
    }

    /**
     * @param {string} prompt 
     * @param {string} systemInstruction 
     * @param {Function} [onChunk] 
     */
    async generate(prompt, systemInstruction = "", onChunk = null) {
        const isStreamRequested = (this.streaming || onChunk) && typeof onChunk === 'function';

        try {
            if (this.type === 'gemini') {
                const options = {
                    model: this.modelName,
                    contents: systemInstruction
                        ? [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nUser request: ${prompt}` }] }]
                        : [{ role: 'user', parts: [{ text: prompt }] }]
                };

                if (isStreamRequested) {
                    const response = await this.client.models.generateContentStream(options);

                    let fullText = "";
                    for await (const chunk of response) {
                        const chunkText = chunk.text || "";
                        if (chunkText) {
                            fullText += chunkText;
                            onChunk(fullText);
                        }
                    }
                    return fullText;
                }

                const response = await this.client.models.generateContent(options);
                return response.text;
            }

            else if (this.type === 'openaiLike') {
                const messages = [];
                if (systemInstruction) {
                    messages.push({ role: "system", content: systemInstruction });
                }
                messages.push({ role: "user", content: prompt });

                if (isStreamRequested) {
                    const stream = await this.client.chat.completions.create({
                        model: this.modelName,
                        messages: messages,
                        stream: true,
                    });

                    let fullText = "";
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            fullText += content;
                            onChunk(fullText);
                        }
                    }
                    return fullText;
                }

                const response = await this.client.chat.completions.create({
                    model: this.modelName,
                    messages: messages,
                });
                return response.choices[0].message.content;
            }

        } catch (error) {
            console.error(`[${this.type}] Generation Error:`, error.message);
            throw error;
        }
    }
}

module.exports = { AI };