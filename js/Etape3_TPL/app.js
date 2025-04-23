// Utiliser l'API de Groq
import { ChatGroq } from "@langchain/groq";
import {ChatPromptTemplate} from "@langchain/core/prompts";    
import * as dotenv from "dotenv";

// Importer les variables d'environnement
dotenv.config();

// Créer une instance de ChatGroq pour parler à l'IA / au llm de notre choix
const chat = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

/*
const prompt = ChatPromptTemplate.fromTemplate(
    `Tu es un expert en développement web et tu dois répondre à la question suivante : {question}`
);
*/

//Création d'un template de prompt
const prompt = ChatPromptTemplate.fromMessages([
    ["system", "always answer in rymes to the user input"],
    ["user", "{input}"],
])

// Création d'une chaine
const chain = prompt.pipe(chat);

// Invoke chain
const response = await chain.invoke({
    input: "Quel est le meilleur framework JavaScript ?",
});

console.log(response);
