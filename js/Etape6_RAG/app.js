
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as dotenv from "dotenv";
import { Document } from "@langchain/core/documents";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";

// Importer les variables d'environnement
dotenv.config();

const chat = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

const prompt = ChatPromptTemplate.fromTemplate(`
    Answer the user's question based on the context provided.
    Context: {context}
    Question: {question}
`);

const cvJP = new Document({
    pageContent: `
        Jean-Paul Da Cunha is a software engineer with a strong background in web development and machine learning. He has experience in building scalable applications and has worked with various programming languages and frameworks. Jean-Paul is passionate about technology and enjoys learning new skills to stay updated with industry trends.
        He has a degree in Computer Science and has worked on several projects involving data analysis and artificial intelligence. In his free time, he enjoys contributing to open-source projects and participating in hackathons.
        Jean-Paul is also an advocate for diversity in tech and actively participates in initiatives that promote inclusivity in the industry.
    `,
    metadata: {
        source: "cv",
        type: "cv"
    }
});

const chain = await createStuffDocumentsChain({
    llm: chat,
    prompt: prompt,
    documents: [cvJP],
});

const response = await chain.invoke({
    question: "What is Jean-Paul Da Cunha's job ?",
    context: [cvJP]
});

console.log(response);
