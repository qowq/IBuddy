/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Configuration ---
const CHAT_API_ENDPOINT = '/.netlify/functions/chat';
const FEEDBACK_API_ENDPOINT = '/.netlify/functions/feedback';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual Client ID

// --- Session & State ---
// 1. Session ID Generation (In-Memory/SessionStorage)
const sessionId = sessionStorage.getItem('sessionId') || crypto.randomUUID();
sessionStorage.setItem('sessionId', sessionId);

// 2. Google Drive "MCP" Connection State (In-Memory)
let tempGoogleToken: string | null = null;
let googleTokenClient: any = null;

// System instruction for the chatbot
const SYSTEM_INSTRUCTION = {
  role: "model",
  parts: [
    {
      text: "You are a friendly, supportive, and encouraging peer mentor for International Baccalaureate (IB) students. Your name is 'IBStress'. You are not a professional counselor, but a helpful AI friend created by a fellow IB student. Keep your responses concise, positive, and easy to understand. Use emojis where appropriate to maintain a friendly tone. Your primary goal is to help students with study tips, stress management, general IB advice, and well-being. Always prioritize safety and if a topic is sensitive or outside your scope (like a mental health crises), gently guide them to seek help from a professional, like a school counselor."
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
const feedbackModal = document.getElementById('feedback-modal')!;
const feedbackReason = document.getElementById('feedback-reason') as HTMLTextAreaElement;
const submitFeedbackBtn = document.getElementById('submit-feedback-btn') as HTMLButtonElement;
const cancelFeedbackBtn = document.getElementById('cancel-feedback-btn') as HTMLButtonElement;
const feedbackCharCount = document.getElementById('feedback-char-count')!;
const footerPrivacyLink = document.getElementById('footer-privacy-link')!;
const connectDriveBtn = document.getElementById('connect-drive-btn') as HTMLButtonElement;


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

function main() {
  setupEventListeners();
  applyInitialTheme();
  setWelcomeGreeting();
  displayDailyTip();
  initGoogleDriveAuth();
}

function setupEventListeners() {
  chatForm.addEventListener('submit', handleFormSubmit);
  themeToggle.addEventListener('change', handleThemeToggle);
  suggestionButtons.forEach(button => {
    button.addEventListener('click', handleSuggestionClick);
  });
  chatInput.addEventListener('input', autoResizeTextarea);
  chatInput.addEventListener('keydown', handleEnterKey);
  
  chatInput.addEventListener('blur', () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 50);
    }
  });
  
  showDisclaimerBtn.addEventListener('click', () => disclaimerModal.classList.remove('hidden'));
  footerPrivacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    disclaimerModal.classList.remove('hidden');
  });
  closeDisclaimerBtn.addEventListener('click', () => disclaimerModal.classList.add('hidden'));
  disclaimerModal.addEventListener('click', (e) => {
    if (e.target === disclaimerModal) {
        disclaimerModal.classList.add('hidden');
    }
  });

  connectDriveBtn.addEventListener('click', handleConnectDrive);
}

// 2. Google Identity Services initTokenClient
function initGoogleDriveAuth() {
    // We wait until the GSI script is loaded
    const checkGsi = setInterval(() => {
        if (typeof (window as any).google !== 'undefined') {
            clearInterval(checkGsi);
            googleTokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: (response: any) => {
                    if (response.access_token) {
                        tempGoogleToken = response.access_token;
                        connectDriveBtn.classList.add('connected');
                        connectDriveBtn.querySelector('span')!.textContent = 'Drive Connected';
                    }
                },
            });
        }
    }, 100);
}

function handleConnectDrive() {
    if (googleTokenClient) {
        googleTokenClient.requestAccessToken();
    }
}

function displayDailyTip() {
    const dayOfMonth = new Date().getDate();
    const tipIndex = (dayOfMonth - 1) % TIPS.length;
    const tip = TIPS[tipIndex];
    dailyTipCard.innerHTML = `💡 <strong>Daily Tip:</strong> ${tip}`;
}

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

function startChatSession() {
    if (isChatStarted) return;
    welcomeScreen.style.display = 'none';
    chatMessages.classList.remove('hidden');
    isChatStarted = true;
}

async function handleFormSubmit(e: Event) {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message || isLoading) return;

  chatInput.value = '';
  autoResizeTextarea();
  await sendMessage(message);
}

async function handleSuggestionClick(e: Event) {
    const target = e.target as HTMLButtonElement;
    const prompt = target.dataset.prompt;
    if (!prompt || isLoading) return;
    
    await sendMessage(prompt);
}

// 3. Main Webhook Payload Update
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
            sessionId: sessionId,
            google_token: tempGoogleToken,
            history: chatHistory,
            body: {
                text: message
            }
        })
    });

    const responseText = await res.text();

    if (!res.ok) {
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

            // Improved Thumbs Up
            const { actionItem: thumbUpAction, button: thumbUpBtn } = createActionButton(
                'Good response',
                'Good response',
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>`
            );
            
            // RESTORED Thumbs Down SVG path
            const { actionItem: thumbDownAction, button: thumbDownBtn } = createActionButton(
                'Bad response',
                'Bad response',
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>`
            );
            
            thumbUpBtn.addEventListener('click', () => {
                sendFeedback('thumbs_up', undefined, message, responseText);
                thumbUpBtn.classList.add('selected-up');
                thumbUpBtn.disabled = true;
                thumbDownBtn.disabled = true;
            });

            thumbDownBtn.addEventListener('click', () => {
                showFeedbackModal(() => {
                    thumbDownBtn.classList.add('selected-down');
                    thumbUpBtn.disabled = true;
                    thumbDownBtn.disabled = true;
                }, message, responseText);
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
        contentWrapper.innerHTML = `Sorry, I'm having a bit of trouble connecting right now. 😓 I have been notified. Please try again in a few minutes!`;
    }
  } finally {
    isLoading = false;
    setFormState(true);
    scrollToBottom();
    chatInput.blur();
  }
}

/**
 * Shows the feedback modal and handles its interactions.
 * @param {() => void} onSuccess - Callback function to execute after successfully submitting feedback.
 */
function showFeedbackModal(onSuccess: () => void, originalQuestion: string, aiAnswer: string) {
    feedbackModal.classList.remove('hidden');
    feedbackReason.value = '';
    submitFeedbackBtn.disabled = true;
    feedbackReason.focus();

    const maxLength = parseInt(feedbackReason.getAttribute('maxlength') || '200', 10);
    feedbackCharCount.textContent = `0 / ${maxLength}`;
    feedbackCharCount.classList.remove('error');

    let isSubmitting = false;
    const originalSubmitText = submitFeedbackBtn.textContent;

    const handleReasonInput = () => {
        const currentLength = feedbackReason.value.length;
        feedbackCharCount.textContent = `${currentLength} / ${maxLength}`;
        submitFeedbackBtn.disabled = feedbackReason.value.trim().length === 0;

        if (currentLength > maxLength) {
            feedbackCharCount.classList.add('error');
        } else {
            feedbackCharCount.classList.remove('error');
        }
    };
    
    const cleanup = () => {
        feedbackModal.classList.add('hidden');
        submitFeedbackBtn.classList.remove('loading');
        submitFeedbackBtn.innerHTML = originalSubmitText || 'Submit';
        submitFeedbackBtn.disabled = true;
        cancelFeedbackBtn.disabled = false;
        feedbackReason.disabled = false;
        
        feedbackModal.removeEventListener('click', handleOverlayClick);
        feedbackReason.removeEventListener('input', handleReasonInput);
        submitFeedbackBtn.removeEventListener('click', handleSubmit);
        cancelFeedbackBtn.removeEventListener('click', handleCancel);
    };

    const handleOverlayClick = (e: MouseEvent) => {
        if (e.target === feedbackModal && !isSubmitting) {
            cleanup();
        }
    };
    
    const handleSubmit = async () => {
        const reason = feedbackReason.value.trim();
        if (!reason || isSubmitting) return;
        
        isSubmitting = true;
        submitFeedbackBtn.classList.add('loading');
        submitFeedbackBtn.innerHTML = `<div class="spinner"></div>`;
        cancelFeedbackBtn.disabled = true;
        feedbackReason.disabled = true;

        try {
            await sendFeedback('thumbs_down', reason, originalQuestion, aiAnswer);
            onSuccess();
        } catch (error) {
            console.error("Failed to submit feedback", error);
        } finally {
            isSubmitting = false;
            cleanup();
        }
    };

    const handleCancel = () => {
        if (!isSubmitting) {
            cleanup();
        }
    };

    feedbackModal.addEventListener('click', handleOverlayClick);
    feedbackReason.addEventListener('input', handleReasonInput);
    submitFeedbackBtn.addEventListener('click', handleSubmit);
    cancelFeedbackBtn.addEventListener('click', handleCancel);
}


/**
 * Sends feedback to the backend.
 * 4. Feedback System Payload Update
 */
async function sendFeedback(type: 'thumbs_up' | 'thumbs_down', reason?: string, originalQuestion?: string, aiAnswer?: string) {
    try {
        const payload = type === 'thumbs_up' 
            ? { thumbsup: true, originalQuestion, aiAnswer } 
            : { thumbsdown: true, reason, originalQuestion, aiAnswer };

        const res = await fetch(FEEDBACK_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to send feedback:', errorText);
            throw new Error(`Feedback submission failed: ${errorText}`);
        }
    } catch (error) {
        console.error('Error sending feedback:', error);
        throw error;
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

function setFormState(isEnabled: boolean) {
  chatInput.disabled = !isEnabled;
  (chatForm.querySelector('button') as HTMLButtonElement).disabled = !isEnabled;
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleThemeToggle() {
    document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light');
}

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        themeToggle.checked = true;
    }
}

function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
}

function handleEnterKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
}

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

main();