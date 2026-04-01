console.log('SCRIPT LOADED');
const SUPABASE_URL = 'https://odqtbnbtxinkasgpebnj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3d-k35DC9CvvqP_O66wi4Q_fHho1mDZ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DAYS = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela'
];

const board = document.getElementById('board');
const mealModalBackdrop = document.getElementById('mealModalBackdrop');
const mealForm = document.getElementById('mealForm');
const modalTitle = document.getElementById('modalTitle');
const daySelect = document.getElementById('daySelect');
const mealTitle = document.getElementById('mealTitle');
const mealType = document.getElementById('mealType');
const mealNotes = document.getElementById('mealNotes');
const addQuickBtn = document.getElementById('addQuickBtn');
const clearWeekBtn = document.getElementById('clearWeekBtn');
const cancelBtn = document.getElementById('cancelBtn');

let plannerData = createEmptyWeek();
let editState = { id: null };

function createEmptyWeek() {
  return DAYS.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});
}

function groupMealsByDay(meals) {
  const week = createEmptyWeek();

  for (const meal of meals) {
    if (week[meal.day]) {
      week[meal.day].push(meal);
    }
  }

  for (const day of DAYS) {
    week[day].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
  }

  return week;
}

async function fetchMeals() {
  const { data, error } = await supabaseClient
    .from('meals')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Błąd pobierania posiłków:', error);
    alert('Nie udało się pobrać danych z bazy.');
    return;
  }

  plannerData = groupMealsByDay(data || []);
  renderBoard();
}

function renderBoard() {
  board.innerHTML = '';

  DAYS.forEach(day => {
    const meals = plannerData[day] || [];
    const column = document.createElement('section');
    column.className = 'day-column';

    column.innerHTML = `
      <div class="day-header">
        <h2>${day}</h2>
        <span class="meal-count">${meals.length} ${getMealCountLabel(meals.length)}</span>
      </div>
      <div class="day-content" data-day="${day}"></div>
    `;

    const content = column.querySelector('.day-content');

    if (meals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Brak posiłków. Dodaj pierwszy.';
      content.appendChild(empty);
    } else {
      meals.forEach(meal => {
        const card = document.createElement('article');
        card.className = 'meal-card';

        card.innerHTML = `
          <div class="meal-card-header">
            <h3 class="meal-card-title">${escapeHtml(meal.title)}</h3>
          </div>
          ${meal.type ? `<div class="meal-type">${escapeHtml(meal.type)}</div>` : ''}
          ${meal.notes ? `<p class="meal-notes">${escapeHtml(meal.notes)}</p>` : ''}
          <div class="meal-actions">
            <button class="icon-btn edit-btn" data-action="edit" data-id="${meal.id}">Edytuj</button>
            <button class="icon-btn delete-btn" data-action="delete" data-id="${meal.id}">Usuń</button>
          </div>
        `;

        content.appendChild(card);
      });
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'add-meal-inline';
    addBtn.textContent = '+ Dodaj posiłek';
    addBtn.addEventListener('click', () => openModal({ day }));
    content.appendChild(addBtn);

    board.appendChild(column);
  });
}

function getMealCountLabel(count) {
  if (count === 1) return 'posiłek';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'posiłki';
  return 'posiłków';
}

function openModal({ day = DAYS[0], meal = null } = {}) {
  editState = { id: meal ? meal.id : null };
  modalTitle.textContent = meal ? 'Edytuj posiłek' : 'Dodaj posiłek';
  daySelect.innerHTML = DAYS.map(d => `<option value="${d}">${d}</option>`).join('');
  daySelect.value = day;
  mealTitle.value = meal?.title || '';
  mealType.value = meal?.type || '';
  mealNotes.value = meal?.notes || '';
  mealModalBackdrop.classList.add('open');
  mealModalBackdrop.setAttribute('aria-hidden', 'false');
  setTimeout(() => mealTitle.focus(), 0);
}

function closeModal() {
  mealModalBackdrop.classList.remove('open');
  mealModalBackdrop.setAttribute('aria-hidden', 'true');
  mealForm.reset();
  editState = { id: null };
}

function findMealById(id) {
  for (const day of DAYS) {
    const found = plannerData[day].find(meal => String(meal.id) === String(id));
    if (found) return found;
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function createMeal(payload) {
  const { error } = await supabaseClient
    .from('meals')
    .insert([payload]);

  if (error) {
    console.error('Błąd dodawania posiłku:', error);
    alert('Nie udało się dodać posiłku.');
    return false;
  }

  return true;
}

async function updateMeal(id, payload) {
  const { error } = await supabaseClient
    .from('meals')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Błąd edycji posiłku:', error);
    alert('Nie udało się zaktualizować posiłku.');
    return false;
  }

  return true;
}

async function deleteMeal(id) {
  const { error } = await supabaseClient
    .from('meals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Błąd usuwania posiłku:', error);
    alert('Nie udało się usunąć posiłku.');
    return;
  }

  await fetchMeals();
}

async function clearWeek() {
  const confirmed = confirm('Na pewno chcesz usunąć wszystkie posiłki z tygodnia?');
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from('meals')
    .delete()
    .neq('id', 0);

  if (error) {
    console.error('Błąd czyszczenia tygodnia:', error);
    alert('Nie udało się wyczyścić tygodnia.');
    return;
  }

  await fetchMeals();
}

mealForm.addEventListener('submit', async event => {
  event.preventDefault();

  const payload = {
    day: daySelect.value,
    title: mealTitle.value.trim(),
    type: mealType.value.trim(),
    notes: mealNotes.value.trim()
  };

  if (!payload.title) {
    mealTitle.focus();
    return;
  }

  let ok = false;

  if (editState.id) {
    ok = await updateMeal(editState.id, payload);
  } else {
    ok = await createMeal(payload);
  }

  if (!ok) return;

  closeModal();
  await fetchMeals();
});

board.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  const id = target.dataset.id;

  if (!action || !id) return;

  if (action === 'edit') {
    const meal = findMealById(id);
    if (meal) {
      openModal({ day: meal.day, meal });
    }
  }

  if (action === 'delete') {
    deleteMeal(id);
  }
});

addQuickBtn.addEventListener('click', () => openModal());
clearWeekBtn.addEventListener('click', clearWeek);
cancelBtn.addEventListener('click', closeModal);

mealModalBackdrop.addEventListener('click', event => {
  if (event.target === mealModalBackdrop) closeModal();
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mealModalBackdrop.classList.contains('open')) {
    closeModal();
  }
});

fetchMeals();