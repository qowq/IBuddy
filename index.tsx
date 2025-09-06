/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Configuration ---
const CHAT_API_ENDPOINT = '/api/chat';
const FEEDBACK_API_ENDPOINT = '/api/feedback';


// System instruction for the chatbot
const SYSTEM_INSTRUCTION = {
  role: "model",
  parts: [
    {
      text: "You are a friendly, supportive, and encouraging peer mentor for International Baccalaureate (IB) students. Your name is 'IBuddy'. You are not a professional counselor, but a helpful AI friend. Keep your responses concise, positive, and easy to understand. Use emojis where appropriate to maintain a friendly tone. Your primary goal is to help students with study tips, stress management, general IB advice, and well-being. Always prioritize safety and if a topic is sensitive or outside your scope (like a mental health crises), gently guide them to seek help from a professional, like a school counselor."
    }
  ],
};

// --- DOM Element References ---
const chatMessages = document.getElementById('chat-messages')!;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
const suggestionButtons = document.querySelectorAll('.suggestion-chips button');
const welcomeScreen = document.getElementById('welcome-screen')!;
const welcomeGreeting = document.getElementById('welcome-greeting')!;
const dailyTipCard = document.getElementById('daily-tip-card')!;
const showDisclaimerBtn = document.getElementById('show-disclaimer-btn')!;
const disclaimerModal = document.getElementById('disclaimer-modal')!;
const closeDisclaimerBtn = document.getElementById('close-disclaimer-btn')!;


// --- State Management ---
interface ChatPart {
  text: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

let chatHistory: ChatMessage[] = [SYSTEM_INSTRUCTION as ChatMessage];
let isLoading = false;
let isChatStarted = false;

// --- Constants ---
const TIPS = [
    "Use the 'Feynman Technique' to test your understanding: try to explain a concept in simple terms, as if to a friend.",
    "Schedule short, frequent breaks during study sessions. The Pomodoro Technique (25 mins on, 5 mins off) is great for this.",
    "Active recall (retrieving information without looking at your notes) is more effective than passive review.",
    "Don't just read your TOK essay prompt; break it down into keywords and questions you need to address.",
    "For your Extended Essay, choose a topic you're genuinely passionate about. It makes the long process much more enjoyable.",
    "Create a study schedule that balances all your subjects, CAS, and personal time. Stick to it as much as possible.",
    "Mind maps are a fantastic way to visualize connections between concepts, especially for subjects like History or Biology.",
    "Practice past papers under timed conditions to get used to the exam pressure and format.",
    "For language acquisition, try watching movies or listening to music in the target language to improve your listening skills.",
    "Your Internal Assessments (IAs) are a marathon, not a sprint. Start early and work on them consistently.",
    "Don't neglect CAS. It's a great opportunity to de-stress and develop new skills. Plan your activities in advance.",
    "Get enough sleep, especially before an exam. A well-rested brain performs significantly better.",
    "Stay hydrated and eat nutritious meals. Your physical health directly impacts your mental clarity and focus.",
    "When you feel overwhelmed, practice mindfulness or deep-breathing exercises for a few minutes.",
    "Form a study group to discuss difficult topics. Explaining concepts to others reinforces your own learning.",
    "Use flashcards for memorizing key terms, dates, or formulas. Apps like Anki use spaced repetition to help you remember.",
    "Keep your notes organized. Whether digital or physical, a good system saves you time and stress later.",
    "Read the IB subject guides. They tell you exactly what you need to know and how you'll be assessed.",
    "Don't be afraid to ask your teachers for help. They are your best resource for clarifying doubts.",
    "For research-heavy tasks, keep a detailed bibliography from the start to avoid last-minute citation panic.",
    "Set realistic daily goals. Ticking them off can provide a great sense of accomplishment and motivation.",
    "Remember that the IB is about more than just grades. It's about developing critical thinking and a love for learning.",
    "Celebrate small victories! Finished a tough chapter? Reward yourself with something you enjoy.",
    "Proofread your work out loud to catch errors and awkward phrasing you might otherwise miss.",
    "Take one day a week completely off from IB work to rest and recharge. It prevents burnout.",
    "Before writing an essay, always create a clear outline. It provides structure and ensures you address all parts of the question.",
    "Understand the command terms used in exam questions (e.g., 'analyze', 'evaluate', 'discuss'). They tell you what's expected.",
    "Keep a balanced perspective. A single bad grade won't define your future. Focus on growth and learning.",
    "Talk to older IB students or alumni for advice and perspective. They've been through it and can offer valuable insights.",
    "Your mental health is a priority. If you're struggling, reach out to your school counselor or a trusted adult."
];


// --- Main Application Logic ---

/**
 * Initializes the application, sets up event listeners, and starts the chat.
 */
function main() {
  setupEventListeners();
  applyInitialTheme();
  setWelcomeGreeting();
  displayDailyTip();
  // The check for API_KEY is now done on the server.
}

/**
 * Sets up all necessary event listeners for the application.
 */
function setupEventListeners() {
  chatForm.addEventListener('submit', handleFormSubmit);
  themeToggle.addEventListener('change', handleThemeToggle);
  suggestionButtons.forEach(button => {
    button.addEventListener('click', handleSuggestionClick);
  });
  chatInput.addEventListener('input', autoResizeTextarea);
  chatInput.addEventListener('keydown', handleEnterKey);
  
  // Disclaimer Modal Listeners
  showDisclaimerBtn.addEventListener('click', () => disclaimerModal.classList.remove('hidden'));
  closeDisclaimerBtn.addEventListener('click', () => disclaimerModal.classList.add('hidden'));
  disclaimerModal.addEventListener('click', (e) => {
    if (e.target === disclaimerModal) {
        disclaimerModal.classList.add('hidden');
    }
  });
}

/**
 * Displays a daily tip based on the day of the month.
 */
function displayDailyTip() {
    const dayOfMonth = new Date().getDate();
    const tipIndex = (dayOfMonth - 1) % TIPS.length;
    const tip = TIPS[tipIndex];
    dailyTipCard.innerHTML = `💡 <strong>Daily Tip:</strong> ${tip}`;
}


/**
 * Sets the greeting message based on the time of day.
 */
function setWelcomeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        welcomeGreeting.textContent = "Good morning!";
    } else if (hour < 18) {
        welcomeGreeting.textContent = "Good afternoon!";
    } else {
        welcomeGreeting.textContent = "Good evening!";
    }
}

/**
 * Transitions the UI from the welcome screen to the chat view.
 */
function startChatSession() {
    if (isChatStarted) return;
    welcomeScreen.style.display = 'none';
    chatMessages.classList.remove('hidden');
    isChatStarted = true;
}

/**
 * Handles the submission of the chat form.
 * @param {Event} e - The form submission event.
 */
async function handleFormSubmit(e: Event) {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message || isLoading) return;

  chatInput.value = '';
  autoResizeTextarea();
  await sendMessage(message);
}

/**
 * Handles clicks on the suggestion chip buttons.
 * @param {Event} e - The button click event.
 */
async function handleSuggestionClick(e: Event) {
    const target = e.target as HTMLButtonElement;
    const prompt = target.dataset.prompt;
    if (!prompt || isLoading) return;
    
    await sendMessage(prompt);
}


/**
 * Sends a message to the AI and handles the streaming response.
 * @param {string} message - The message to send.
 */
async function sendMessage(message: string) {
  startChatSession();
  isLoading = true;
  setFormState(false);
  appendMessage('user', message);

  const aiMessageElement = appendMessage('model', '');
  const loadingSpinner = showLoadingIndicator(aiMessageElement);
  
  try {
    const res = await fetch(CHAT_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            history: chatHistory,
            body: {
                text: message
            }
        })
    });

    const responseText = await res.text();

    if (!res.ok) {
      // Try to parse error from serverless function
      try {
        const errorJson = JSON.parse(responseText);
        throw new Error(errorJson.error || `Request failed with status ${res.status}`);
      } catch {
        throw new Error(responseText || `Request failed with status ${res.status}`);
      }
    }
    
    if (!responseText) {
         throw new Error('Received an empty response from the server.');
    }

    chatHistory.push({ role: 'user', parts: [{ text: message }] });
    chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
    
    if (loadingSpinner.parentNode) {
        loadingSpinner.remove();
    }
    const contentWrapper = aiMessageElement.querySelector('.message-content');
    if (contentWrapper) {
        contentWrapper.innerHTML = simpleMarkdownToHtml(responseText);

        const messageAndFeedbackContainer = aiMessageElement.querySelector('.message-and-feedback');
        if (messageAndFeedbackContainer) {
            const feedbackActions = document.createElement('div');
            feedbackActions.className = 'feedback-actions';

            const createActionButton = (label: string, tooltipText: string, svg: string) => {
                const actionItem = document.createElement('div');
                actionItem.className = 'action-item';
                
                const button = document.createElement('button');
                button.className = 'feedback-btn';
                button.setAttribute('aria-label', label);
                button.innerHTML = svg;

                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip-text';
                tooltip.textContent = tooltipText;

                actionItem.appendChild(button);
                actionItem.appendChild(tooltip);

                return { actionItem, button };
            };

            const { actionItem: copyAction, button: copyBtn } = createActionButton(
                'Copy', 
                'Copy', 
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
            );
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(responseText);
                const tooltip = copyBtn.parentElement!.querySelector('.tooltip-text');
                if (tooltip) {
                    tooltip.textContent = 'Copied!';
                    setTimeout(() => {
                        tooltip.textContent = 'Copy';
                    }, 1500);
                }
            });

            const { actionItem: thumbUpAction, button: thumbUpBtn } = createActionButton(
                'Good response',
                'Good response',
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`
            );
            
            const { actionItem: thumbDownAction, button: thumbDownBtn } = createActionButton(
                'Bad response',
                'Bad response',
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>`
            );
            
            thumbUpBtn.addEventListener('click', () => {
                sendFeedback('thumbs_up');
                thumbUpBtn.classList.add('selected-up');
                thumbUpBtn.disabled = true;
                thumbDownBtn.disabled = true;
            });

            thumbDownBtn.addEventListener('click', () => {
                sendFeedback('thumbs_down');
                thumbDownBtn.classList.add('selected-down');
                thumbUpBtn.disabled = true;
                thumbDownBtn.disabled = true;
            });
            
            feedbackActions.appendChild(copyAction);
            feedbackActions.appendChild(thumbUpAction);
            feedbackActions.appendChild(thumbDownAction);
            messageAndFeedbackContainer.appendChild(feedbackActions);
        }
    }


  } catch (error) {
    console.error("Error sending message:", error);
    if (loadingSpinner.parentNode) {
        loadingSpinner.remove();
    }
    const contentWrapper = aiMessageElement.querySelector('.message-content');
    if (contentWrapper) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        contentWrapper.innerHTML = `Sorry, something went wrong. Please try again.<br><small>Error: ${errorMessage}</small>`;
    }
  } finally {
    isLoading = false;
    setFormState(true);
    scrollToBottom();
  }
}

/**
 * Sends feedback to the backend.
 * @param {'thumbs_up' | 'thumbs_down'} type The type of feedback.
 */
async function sendFeedback(type: 'thumbs_up' | 'thumbs_down') {
    try {
        // Construct a simple payload based on the feedback type.
        // The message content is NOT included.
        const payload = type === 'thumbs_up' 
            ? { thumbsup: true } 
            : { thumbsdown: true };

        const res = await fetch(FEEDBACK_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            // Log the error but don't bother the user with it.
            console.error('Failed to send feedback:', await res.text());
        } else {
            console.log(`Feedback '${type}' sent successfully.`);
        }
    } catch (error) {
        console.error('Error sending feedback:', error);
    }
}


/**
 * Appends a message to the chat window.
 * @param {'user' | 'model'} role - The role of the message sender.
 * @param {string} text - The content of the message.
 * @returns {HTMLDivElement} The created message element.
 */
function appendMessage(role: 'user' | 'model', text: string): HTMLDivElement {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', `${role}-message`);
  
  if (role === 'model') {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 7L12 12M22 7L12 12M12 22V12M17 4.5L7 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    messageElement.appendChild(avatar);

    const messageAndFeedbackContainer = document.createElement('div');
    messageAndFeedbackContainer.className = 'message-and-feedback';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content';
    contentWrapper.innerHTML = simpleMarkdownToHtml(text);
    
    messageAndFeedbackContainer.appendChild(contentWrapper);
    messageElement.appendChild(messageAndFeedbackContainer);
  } else {
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content';
    contentWrapper.innerHTML = simpleMarkdownToHtml(text);
    messageElement.appendChild(contentWrapper);
  }

  chatMessages.appendChild(messageElement);
  scrollToBottom();
  return messageElement;
}

/**
 * Displays a loading spinner inside a message bubble.
 * @param {HTMLElement} parentElement - The element to append the spinner to.
 * @returns {HTMLDivElement} The spinner element.
 */
function showLoadingIndicator(parentElement: HTMLElement): HTMLDivElement {
    const spinner = document.createElement('div');
    spinner.classList.add('spinner');
    const contentWrapper = parentElement.querySelector('.message-content');
    if (contentWrapper) {
        contentWrapper.appendChild(spinner);
    } else {
        parentElement.appendChild(spinner);
    }
    scrollToBottom();
    return spinner;
}


/**
 * Renders an error message on the welcome screen.
 * @param {string} message - The error message to display.
 */
function showWelcomeError(message: string) {
    const suggestionsContainer = document.querySelector('.suggestion-chips')!;
    suggestionsContainer.innerHTML = ''; 

    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `<strong>Oops! Connection Failed.</strong><br>${message}<br>The chat is disabled until the connection is restored.`;
    
    const dailyTip = document.getElementById('daily-tip-card');
    if (dailyTip) {
        dailyTip.insertAdjacentElement('beforebegin', errorElement);
        errorElement.style.marginBottom = '1rem';
    } else {
        welcomeScreen.appendChild(errorElement);
    }
    
    setFormState(false);
}

/**
 * Enables or disables the chat form inputs.
 * @param {boolean} isEnabled - Whether to enable the form.
 */
function setFormState(isEnabled: boolean) {
  chatInput.disabled = !isEnabled;
  (chatForm.querySelector('button') as HTMLButtonElement).disabled = !isEnabled;
}

/**
 * Scrolls the chat messages container to the bottom.
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Toggles the theme between light and dark mode.
 */
function handleThemeToggle() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

/**
 * Applies the theme from localStorage on initial load.
 */
function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }
}

/**
 * Auto-resizes the textarea height based on content.
 */
function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
}

/**
 * Handles the Enter key press in the textarea.
 * @param {KeyboardEvent} e
 */
function handleEnterKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
}

/**
 * A very simple and safe Markdown to HTML converter.
 * Supports **bold**, *italic*, and newlines.
 * @param {string} text The text to convert.
 * @returns {string} The HTML string.
 */
function simpleMarkdownToHtml(text: string): string {
    const sanitizedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return sanitizedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
        .replace(/\*(.*?)\*/g, '<em>$1</em>')       
        .replace(/\n/g, '<br>'); 
}


// --- Entry Point ---
main();