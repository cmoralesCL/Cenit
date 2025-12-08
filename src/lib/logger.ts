
'use server';

import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'error.log');

function formatLogMessage(error: any, contextData?: any): string {
    const timestamp = new Date().toISOString();
    let errorMessage = `[${timestamp}] - DETAILED ERROR LOG\n`;

    if (contextData?.at) {
        errorMessage += `Error occurred at: ${contextData.at}\n`;
        delete contextData.at;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage += `Error Type: Database/API Error\n`;
        errorMessage += `Message: ${error.message}\n`;
        if ('code' in error) errorMessage += `Code: ${error.code}\n`;
        if ('details' in error) errorMessage += `Details: ${error.details}\n`;
        if ('hint' in error) errorMessage += `Hint: ${error.hint}\n`;
        
        if (error instanceof Error && error.stack) {
            errorMessage += `Stack Trace:\n${error.stack}\n`;
        }
    } 
    else if (error instanceof Error) {
        errorMessage += `Error Type: Javascript Error\n`;
        errorMessage += `Name: ${error.name}\n`;
        errorMessage += `Message: ${error.message}\n`;
        if (error.stack) {
            errorMessage += `Stack Trace:\n${error.stack}\n`;
        }
    } 
    else {
        errorMessage += `Error Type: Non-Error Object Caught\n`;
        try {
            const prettyPrinted = JSON.stringify(error, null, 2);
            errorMessage += `Content: ${prettyPrinted}\n`;
        } catch {
            errorMessage += `Content (unserializable): ${error}\n`;
        }
    }

    if (contextData && Object.keys(contextData).length > 0) {
        errorMessage += `\nCONTEXT DATA:\n`;
        try {
            const prettyContext = JSON.stringify(contextData, null, 2);
            errorMessage += `${prettyContext}\n`;
        } catch {
            errorMessage += `Context (unserializable): ${contextData}\n`;
        }
    }

    errorMessage += '--------------------------------------------------\n\n';
    return errorMessage;
}

export async function logError(error: any, contextData?: any): Promise<void> {
    // Log raw objects for interactive terminal inspection
    console.error("--- RAW ERROR OBJECT ---", error);
    if (contextData) {
        console.error("--- RAW CONTEXT OBJECT ---", contextData);
    }

    const message = formatLogMessage(error, contextData);

    // Log the formatted, detailed string for readability and file logging
    console.error(message);

    try {
        fs.appendFileSync(logFilePath, message, 'utf8');
    } catch (writeError) {
        console.error("Critical: Logging to file failed. The environment might not have write permissions.", writeError);
    }
}
