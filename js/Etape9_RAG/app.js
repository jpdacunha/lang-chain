
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as dotenv from "dotenv";
import { Document } from "@langchain/core/documents";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";

dotenv.config();

const llm = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Answer the user's question based on the following context: {context}."],
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
]);

const chain = await createStuffDocumentsChain({
    prompt,
    llm
});

const pdfLoader = new PDFLoader("documents/test.pdf");
const pdfDocs = await pdfLoader.load();

const loader = new CheerioWebBaseLoader("https://js.langchain.com/docs/integrations/document_loaders/web_loaders/spider/");
const docs = await loader.load();

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 250,
    chunkOverlap: 50,
});

const splittedDocs = await splitter.splitDocuments(docs);

splittedDocs.push(...pdfDocs);

const ollamaEmbeddings = new OllamaEmbeddings({
    model: "mistral:latest",
    baseUrl: "http://127.0.0.1:11434",
});

const vectorStore = await MemoryVectorStore.fromDocuments(splittedDocs, ollamaEmbeddings);

const retriever = vectorStore.asRetriever({
    k: 2,
});

const rephrasePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
    ["user", "Given the above conversation, generate a search query to look up to get information relevant to the conversation."],
]);

const historyAwareRetriever = await createHistoryAwareRetriever({
    retriever,
    chatHistorySize: 2,
    llm,
    rephrasePrompt,
});

const conversationChain = await createRetrievalChain({
    combineDocsChain: chain,
    retriever: historyAwareRetriever,
});

const chatHistory = [
    new HumanMessage("Le chiffre préféré de JP Da cunha est le 5."),
    new AIMessage("OK, son chiffre préféré est le 5."),
    new HumanMessage("Quelle est la couleur préférée de JP Da cunha ?"),
    new AIMessage("Rouge"),
];

const response = await conversationChain.invoke({
    input: "Ma couleur préférée est le rouge et mon chiffre préféré est 5 qui suis-je ?",
    chat_history: chatHistory,
});

console.log("> response -----------------------------------------");
console.log(response);
console.log("< response -----------------------------------------");

