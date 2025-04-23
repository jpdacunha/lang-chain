// Utiliser l'API de Groq
import { ChatGroq } from "@langchain/groq";
import {ChatPromptTemplate} from "@langchain/core/prompts";    
import {StringOutputParser, CommaSeparatedListOutputParser, StructuredOutputParser} from "@langchain/core/output_parsers";
import {OutputFixingParser} from "langchain/output_parsers";
import { z } from "zod";
import * as dotenv from "dotenv";

// Importer les variables d'environnement
dotenv.config();

// Créer une instance de ChatGroq pour parler à l'IA / au llm de notre choix
const chat = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    // Améliorer la prédictibilité de la réponse de l'IA en diminuant la température
    // La température est un paramètre qui contrôle la créativité de la réponse de l'IA
    temperature: 0.5
});

async function useStructuredOutputParser() {

    //Création d'un template de prompt
    const prompt = ChatPromptTemplate.fromTemplate(`
        Give me the state of the light following input 
        Formating instructions: {format}
        input: {input}
        Never use backticks in your response
    `)

    //Création d'un parser de sortie
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
        name: "Light name",
        state: "Light state",
        color: "Light color",
        brightness: "Light brightness",
    });

    const outputFixer = OutputFixingParser.fromLLM(chat, parser);

    const chain = prompt.pipe(chat).pipe(outputFixer);

    try {
        // Invoke chain
        const response = await chain.invoke({
            input: "The light LightOne is turned on, the color is red and brightness is 50%",
            format: parser.getFormatInstructions(),
        });

        return response
    }
    catch (error) {
        console.error("Error invoking chain:", error);
        return null;
    }

}

console.log(await useStructuredOutputParser());

