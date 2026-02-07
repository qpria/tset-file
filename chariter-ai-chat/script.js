// ===============================
// STATE
// ===============================
const state = {
  characters: [],
  selectedCharacterId: null,
  liveMode: {
    tone: 'inherit',
    toneIntensity: 3,
    affectionEnabled: false,
    trustEnabled: false,
  },
  stats: {
    affection: 0,
    trust: 0,
  },
};

// ===============================
// DOM HELPERS
// ===============================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ===============================
// ELEMENTS
// ===============================
const characterListEl = $('#characterList');
const characterForm = $('#characterForm');
const editorTitle = $('#editorTitle');
const deleteCharacterBtn = $('#deleteCharacterBtn');
const resetFormBtn = $('#resetFormBtn');
const saveCharacterBtn = $('#saveCharacterBtn');
const newCharacterBtn = $('#newCharacterBtn');

const startChatBtn = $('#startChatBtn');
const toggleViewBtn = $('#toggleViewBtn');
const characterScreen = $('#characterScreen');
const chatScreen = $('#chatScreen');

const chatTitle = $('#chatTitle');
const chatSubtitle = $('#chatSubtitle');
const chatCharName = $('#chatCharName');
const chatRelationship = $('#chatRelationship');
const chatAvatarOrb = $('#chatAvatarOrb');
const moodChip = $('#moodChip');
const chatVisual = $('#chatVisual');
const visualCaption = $('#visualCaption');

const chatLog = $('#chatLog');
const chatForm = $('#chatForm');
const chatMessageInput = $('#chatMessage');

const affectionValueEl = $('#affectionValue');
const affectionBarEl = $('#affectionBar');
const affectionTextEl = $('#affectionText');
const trustValueEl = $('#trustValue');
const trustBarEl = $('#trustBar');
const trustTextEl = $('#trustText');

const systemLogEl = $('#systemLog');

// Character form inputs
const charNameInput = $('#charName');
const charRoleInput = $('#charRole');
const charRelationshipInput = $('#charRelationship');
const charBackstoryInput = $('#charBackstory');
const charToneSelect = $('#charTone');
const charToneIntensityInput = $('#charToneIntensity');
const affectionEnabledInput = $('#affectionEnabled');
const trustEnabledInput = $('#trustEnabled');
const charGuidelinesInput = $('#charGuidelines');

// ===============================
// UTIL
// ===============================
const uuid = () => Math.random().toString(36).slice(2, 9);

const currentCharacter = () =>
  state.characters.find(c => c.id === state.selectedCharacterId) || null;

function logSystem(msg) {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  systemLogEl.prepend(li);
}

// ===============================
// RENDER
// ===============================
function renderCharacterList() {
  characterListEl.innerHTML = '';

  if (state.characters.length === 0) {
    const li = document.createElement('li');
    li.textContent = '캐릭터가 없습니다.';
    characterListEl.appendChild(li);
    return;
  }

  state.characters.forEach(c => {
    const li = document.createElement('li');
    li.className = 'character-item';
    if (c.id === state.selectedCharacterId) {
      li.classList.add('character-item--active');
    }

    li.textContent = c.name;
    li.onclick = () => {
      state.selectedCharacterId = c.id;
      loadCharacterToForm(c);
      updateChatHeader();
      renderCharacterList();
      logSystem(`"${c.name}" 선택됨`);
    };

    characterListEl.appendChild(li);
  });
}

function loadCharacterToForm(c) {
  editorTitle.textContent = '캐릭터 편집';
  deleteCharacterBtn.disabled = false;

  charNameInput.value = c.name;
  charRoleInput.value = c.role;
  charRelationshipInput.value = c.relationship;
  charBackstoryInput.value = c.backstory;
  charToneSelect.value = c.tone;
  charToneIntensityInput.value = c.toneIntensity;
  affectionEnabledInput.checked = c.affectionEnabled;
  trustEnabledInput.checked = c.trustEnabled;
  charGuidelinesInput.value = c.guidelines;
}

function resetCharacterForm() {
  editorTitle.textContent = '캐릭터 생성';
  characterForm.reset();
  deleteCharacterBtn.disabled = true;
  state.selectedCharacterId = null;
}

// ===============================
// CHAT
// ===============================
function updateChatHeader() {
  const c = currentCharacter();
  if (!c) {
    chatTitle.textContent = '채팅';
    chatSubtitle.textContent = '캐릭터를 선택하세요';
    chatCharName.textContent = '-';
    chatRelationship.textContent = '-';
    return;
  }

  chatTitle.textContent = `${c.name}와의 대화`;
  chatSubtitle.textContent = c.backstory || '';
  chatCharName.textContent = c.name;
  chatRelationship.textContent = c.relationship;
}

function appendMessage(from, text) {
  const row = document.createElement('div');
  row.className = `message-row message-row--${from}`;

  const bubble = document.createElement('div');
  bubble.className = `message message-${from}`;
  bubble.textContent = text;

  row.appendChild(bubble);
  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function fakeAIResponse(text) {
  const c = currentCharacter();
  return `${c.name}: "${text}"에 반응하며 조용히 고개를 끄덕인다.`;
}

// ===============================
// EVENTS
// ===============================
characterForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = {
    id: state.selectedCharacterId || uuid(),
    name: charNameInput.value || '이름 없음',
    role: charRoleInput.value,
    relationship: charRelationshipInput.value,
    backstory: charBackstoryInput.value,
    tone: charToneSelect.value,
    toneIntensity: Number(charToneIntensityInput.value),
    affectionEnabled: affectionEnabledInput.checked,
    trustEnabled: trustEnabledInput.checked,
    guidelines: charGuidelinesInput.value,
  };

  const idx = state.characters.findIndex(c => c.id === data.id);
  if (idx >= 0) {
    state.characters[idx] = data;
    logSystem('캐릭터 수정됨');
  } else {
    state.characters.push(data);
    logSystem('캐릭터 생성됨');
  }

  state.selectedCharacterId = data.id;
  renderCharacterList();
  updateChatHeader();
});

deleteCharacterBtn.addEventListener('click', () => {
  if (!state.selectedCharacterId) return;
  state.characters = state.characters.filter(c => c.id !== state.selectedCharacterId);
  resetCharacterForm();
  renderCharacterList();
  updateChatHeader();
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatMessageInput.value.trim();
  if (!text) return;

  if (!currentCharacter()) {
    appendMessage('ai', '캐릭터를 먼저 선택하세요.');
    return;
  }

  appendMessage('user', text);
  chatMessageInput.value = '';

  setTimeout(() => {
    appendMessage('ai', fakeAIResponse(text));
  }, 300);
});

// ===============================
// INIT
// ===============================
renderCharacterList();
updateChatHeader();
