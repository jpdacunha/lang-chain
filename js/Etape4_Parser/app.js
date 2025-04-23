// Utiliser l'API de Groq
import { ChatGroq } from "@langchain/groq";
import {ChatPromptTemplate} from "@langchain/core/prompts";    
import {StringOutputParser, CommaSeparatedListOutputParser, StructuredOutputParser} from "@langchain/core/output_parsers";
import { z } from "zod";
import * as dotenv from "dotenv";

// Importer les variables d'environnement
dotenv.config();

// Créer une instance de ChatGroq pour parler à l'IA / au llm de notre choix
const chat = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7
});

//Fonction pour utiliser le parser de sortie StringOutputParser
async function useStringOutputParser() {

    //Création d'un template de prompt
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "Always answer in rymes to the user input"],
        ["user", "{input}"],
    ])

    //Création d'un parser de sortie
    const parser = new StringOutputParser();

    const chain = prompt.pipe(chat).pipe(parser);

    // Invoke chain
    const response = await chain.invoke({
        input: "What is the color of the sky ?",
    });

    return response
}

async function useListOutputParser() {

    //Création d'un template de prompt
    const prompt = ChatPromptTemplate.fromMessages([
        ["user", "List 5 objects with following color: {color}"],
    ])

    //Création d'un parser de sortie
    const parser = new CommaSeparatedListOutputParser();

    const chain = prompt.pipe(chat).pipe(parser);

    // Invoke chain
    const response = await chain.invoke({
        color: "red",
    });

    return response
}

async function useStructuredOutputParser() {

    //Création d'un template de prompt
    const prompt = ChatPromptTemplate.fromTemplate(`
        Give me the state of the light following input 
        Formating instructions: {format}
        input: {input}
    `)

    //Création d'un parser de sortie
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
        name: "Light name",
        state: "Light state",
        color: "Light color",
        brightness: "Light brightness",
    });

    const chain = prompt.pipe(chat).pipe(parser);

    // Invoke chain
    const response = await chain.invoke({
        input: "The light LightOne is turned on, the color is red and brightness is 50%",
        format: parser.getFormatInstructions(),
    });

    return response
}

//Zod est un parser de schéma alternatif souvent plus fiable
//https://zod.dev/?id=introduction
async function useZodStructuredOutputParser() {

    //Création d'un template de prompt
    const prompt = ChatPromptTemplate.fromTemplate(`
        Give me the state of the light following input 
        Formating instructions: {format}
        input: {input}
    `)

    //Création d'un parser de sortie
    const parser = StructuredOutputParser.fromZodSchema(
        z.object({
            name: z.string().describe("Light name"),
            state: z.string().describe("Light state"),
            color: z.string().describe("Light color"),
            brightness: z.string().describe("Light brightness"),
        })
    );

    const chain = prompt.pipe(chat).pipe(parser);

    // Invoke chain
    const response = await chain.invoke({
        input: "The light LightOne is turned on, the color is red and brightness is 50%",
        format: parser.getFormatInstructions(),
    });

    return response
}

//console.log(await useStringOutputParser());
//console.log(await useListOutputParser());
//console.log(await useStructuredOutputParser());
console.log(await useZodStructuredOutputParser());

