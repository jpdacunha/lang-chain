const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

const MessageTypes = {
    USER: 'user',
    AI: 'ai',
    ERROR: 'error'
};
    
function addMessage(message, messageType) {
    const messageDiv = document.createElement('div');

    let cssclassName = "message ";
    if (messageType === MessageTypes.USER) {
        cssclassName += 'user-message';
    } else if (messageType === MessageTypes.AI) {
        cssclassName += 'ai-message';
    } else if (messageType === MessageTypes.ERROR) {
        cssclassName += 'error-message';
    } 
    console.log("className: ", cssclassName);
    messageDiv.className = cssclassName;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, MessageTypes.USER);
    userInput.value = '';

    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();
        addMessage(data.response, MessageTypes.AI);
    } catch (error) {
        console.error('Error:', error);
        addMessage(`ERROR : Nom : ${error.name} Message : ${error.message}`, MessageTypes.ERROR);
    }
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
