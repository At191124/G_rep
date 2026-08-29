const STORAGE_KEY = 'training-dashboard-workouts';
const MESSAGE_KEY = 'training-dashboard-message';
const SESSIONS_KEY = 'training-dashboard-sessions';

const defaultWorkouts = [];
const legacyWorkoutNames = new Set([
  'Upper Body Power',
  'Tempo Run',
  'Recovery Reset',
  'MetCon Circuit'
]);

function clearLegacyDemoData() {
  const legacyMessagePatterns = [
    'Lat pulldowns',
    'Triceps block pushdown',
    'Recovery week is on track',
    '26.07.26'
  ];

  const rawMessage = localStorage.getItem(MESSAGE_KEY);
  if (rawMessage && legacyMessagePatterns.some((pattern) => rawMessage.includes(pattern))) {
    localStorage.removeItem(MESSAGE_KEY);
  }

  [STORAGE_KEY, SESSIONS_KEY].forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      if (parsed.some((workout) => workout && typeof workout === 'object' && legacyWorkoutNames.has(workout.name))) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      // ignore malformed cached data and keep the app resilient
    }
  });
}

clearLegacyDemoData();

const state = {
  filter: 'all',
  weekOnly: false,
  workouts: readWorkouts()
};

const typeLabels = {
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  hiit: 'HIIT'
};

const workoutList = document.getElementById('workout-list');
const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
const weeklyChart = document.getElementById('weekly-chart');
const thisWeekButton = document.getElementById('this-week-button');

const form = document.getElementById('log-form');

if (form) {
  document.getElementById('workout-date').valueAsDate = new Date();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const rawExercises = document.getElementById('workout-exercises').value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const exercises = rawExercises.map((line) => parseExercise(line));

    const workout = {
      id: Date.now(),
      date: document.getElementById('workout-date').value,
      type: document.getElementById('workout-type').value,
      name: document.getElementById('workout-name').value.trim(),
      duration: Number(document.getElementById('workout-duration').value) || 45,
      notes: document.getElementById('workout-notes').value.trim(),
      exercises: exercises.filter(Boolean)
    };

    state.workouts.unshift(workout);
    saveWorkouts();
    render();
    form.reset();
    document.getElementById('workout-date').valueAsDate = new Date();
    document.getElementById('workout-type').value = 'strength';
    document.getElementById('workout-duration').value = 60;
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    state.weekOnly = false;
    if (thisWeekButton) {
      thisWeekButton.classList.remove('active');
      thisWeekButton.setAttribute('aria-pressed', 'false');
      thisWeekButton.textContent = 'This week';
    }
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderWorkouts();
  });
});

if (thisWeekButton) {
  thisWeekButton.addEventListener('click', () => {
    state.weekOnly = !state.weekOnly;
    thisWeekButton.classList.toggle('active', state.weekOnly);
    thisWeekButton.setAttribute('aria-pressed', String(state.weekOnly));
    thisWeekButton.textContent = state.weekOnly ? 'All weeks' : 'This week';

    filterButtons.forEach((button) => button.classList.toggle('active', !state.weekOnly && button.dataset.filter === state.filter));
    renderWorkouts();
  });
}

const resetDemoButton = document.getElementById('reset-demo');
if (resetDemoButton) {
  resetDemoButton.addEventListener('click', () => {
    state.workouts = structuredClone(defaultWorkouts);
    saveWorkouts();
    render();
  });
}

render();

function readWorkouts() {
  const savedSessions = localStorage.getItem(SESSIONS_KEY);

  if (savedSessions) {
    try {
      const sessions = JSON.parse(savedSessions);
      if (Array.isArray(sessions) && sessions.length) {
        return sessions;
      }
    } catch (error) {
      // ignore malformed data and fall through
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorkouts));
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorkouts));
    return [];
  }
}

function saveWorkouts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.workouts));
}

function saveSessionEntry(rawText) {
  const parsed = parseSessionEntry(rawText);
  if (!parsed) {
    return false;
  }

  const current = safeReadSessions();
  current.unshift(parsed);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(current));
  localStorage.setItem(MESSAGE_KEY, rawText);
  state.workouts = current;
  saveWorkouts();
  return true;
}

function safeReadSessions() {
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function parseSessionEntry(rawText) {
  const text = String(rawText || '').trim();
  if (!text) {
    return null;
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const date = normalizeDateValue(extractDate(lines[0]) || new Date().toISOString().slice(0, 10));
  const exerciseLines = lines.slice(1);
  const exerciseData = [];

  exerciseLines.forEach((line) => {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (!match) {
      return;
    }

    const name = match[1].trim();
    const valueText = match[2].trim();
    const setEntries = valueText
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => parseSetEntry(part))
      .filter(Boolean);

    if (!setEntries.length) {
      return;
    }

    exerciseData.push({
      name,
      sets: setEntries,
      notes: valueText.includes('(') ? valueText.match(/\((.*)\)/)?.[1] || '' : ''
    });
  });

  if (!exerciseData.length) {
    return null;
  }

  const totalVolume = exerciseData.reduce((sum, exercise) => sum + calculateExerciseVolume(exercise.sets), 0);

  return {
    id: Date.now(),
    date,
    type: 'strength',
    name: `Workout ${date}`,
    duration: Math.max(30, exerciseData.length * 15),
    notes: text,
    exercises: exerciseData,
    totalVolume
  };
}

function extractDate(text) {
  const normalized = text.trim();

  if (/^\d{2}\.\d{2}\.\d{2}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return match ? match[1] : null;
}

function normalizeDateValue(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{2}\.\d{2}\.\d{2}$/.test(text)) {
    const [day, month, yearShort] = text.split('.');
    const fullYear = Number(yearShort) < 50 ? 2000 + Number(yearShort) : 1900 + Number(yearShort);
    return new Date(Date.UTC(fullYear, Number(month) - 1, Number(day))).toISOString().slice(0, 10);
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text)) {
    const [first, second, third] = text.split('/');
    const month = Number(first);
    const day = Number(second);
    const rawYear = Number(third);
    const year = rawYear < 100 ? (rawYear < 50 ? 2000 + rawYear : 1900 + rawYear) : rawYear;
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function parseSetEntry(part) {
  const clean = part.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*\*\s*(\d+)/i);

  if (!match) {
    return null;
  }

  const weight = Number(match[1]);
  const reps = Number(match[2]);

  if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
    return null;
  }

  return { weight, reps };
}

function calculateExerciseVolume(sets) {
  if (!Array.isArray(sets) || !sets.length) {
    return 0;
  }

  return sets.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0);
}

function render() {
  renderSummary();
  renderWeeklyChart();
  renderWorkouts();
  renderPublicMessage();
}

function renderPublicMessage() {
  const container = document.getElementById('public-message');
  if (!container) return;

  const message = localStorage.getItem('training-dashboard-message') || 'No update yet.';
  container.textContent = message;
}

function renderSummary() {
  const totalSessions = state.workouts.length;
  const totalVolume = state.workouts.reduce((sum, workout) => sum + calculateVolume(workout.exercises), 0);
  const avgDuration = totalSessions ? Math.round(state.workouts.reduce((sum, workout) => sum + Number(workout.duration), 0) / totalSessions) : 0;
  const streak = calculateStreak();

  document.getElementById('total-sessions').textContent = totalSessions;
  document.getElementById('total-volume').textContent = formatVolume(totalVolume);
  document.getElementById('avg-duration').textContent = `${avgDuration}m`;
  document.getElementById('streak-count').textContent = streak;
}

function renderWeeklyChart() {
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      iso: date.toISOString().slice(0, 10),
      volume: 0
    };
  });

  state.workouts.forEach((workout) => {
    const normalizedWorkoutDate = normalizeDateValue(workout.date);
    const matchingDay = chartDays.find((day) => day.iso === normalizedWorkoutDate);
    if (matchingDay) {
      matchingDay.volume += calculateVolume(workout.exercises);
    }
  });

  const maxVolume = Math.max(...chartDays.map((day) => day.volume), 1);

  weeklyChart.innerHTML = chartDays
    .map(
      (day) => `
        <div class="chart-bar">
          <div class="bar-visual" style="height: ${Math.max((day.volume / maxVolume) * 120, 16)}px"></div>
          <small>${day.label}</small>
        </div>
      `
    )
    .join('');
}

function isWithinCurrentWeek(dateString) {
  const iso = normalizeDateValue(dateString);
  const current = new Date(`${iso}T00:00:00`);
  const now = new Date();

  const startOfWeek = new Date(now);
  const dayOffset = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(now.getDate() - dayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return current >= startOfWeek && current <= endOfWeek;
}

function renderWorkouts() {
  let filteredWorkouts = state.workouts;

  if (state.weekOnly) {
    filteredWorkouts = filteredWorkouts.filter((workout) => isWithinCurrentWeek(workout.date));
  }

  if (state.filter !== 'all') {
    filteredWorkouts = filteredWorkouts.filter((workout) => workout.type === state.filter);
  }

  if (!filteredWorkouts.length) {
    workoutList.innerHTML = '<div class="empty-state">No workouts saved for this filter yet.</div>';
    return;
  }

  workoutList.innerHTML = filteredWorkouts
    .map(
      (workout, index) => `
        <article class="workout-entry ${index === 0 ? 'open' : ''}" data-workout-id="${workout.id}">
          <button class="entry-header" type="button" aria-expanded="${index === 0}">
            <div class="entry-main">
              <strong>${escapeHtml(workout.name)}</strong>
              <span>${formatDate(workout.date)} • ${workout.duration} min</span>
            </div>
            <span class="entry-badge">${typeLabels[workout.type] || workout.type}</span>
            <span class="entry-volume">${formatVolume(calculateVolume(workout.exercises))}</span>
          </button>
          <div class="entry-details">
            <div class="entry-body">
              <ul>
                ${workout.exercises
                  .map((exercise) => {
                    const setCount = Array.isArray(exercise.sets) ? exercise.sets.length : Number(exercise.sets) || 1;
                    const repCount = Array.isArray(exercise.sets)
                      ? exercise.sets.reduce((sum, setItem) => sum + Number(setItem.reps || 0), 0)
                      : Number(exercise.reps) || 1;
                    const weightValue = Array.isArray(exercise.sets)
                      ? Math.max(...exercise.sets.map((setItem) => Number(setItem.weight || 0)))
                      : Number(exercise.weight) || 0;

                    return `
                      <li>
                        <div>
                          <div class="exercise-name">${escapeHtml(exercise.name)}</div>
                          <div class="exercise-meta">${setCount} sets • ${repCount} reps</div>
                        </div>
                        <strong>${weightValue ? `${weightValue} kg` : 'Bodyweight'}</strong>
                      </li>
                    `;
                  })
                  .join('') || '<li><span>No exercise details recorded.</span></li>'}
              </ul>
              <div class="entry-notes">${workout.notes ? escapeHtml(workout.notes) : 'No additional notes for this workout.'}</div>
            </div>
          </div>
        </article>
      `
    )
    .join('');

  document.querySelectorAll('.entry-header').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = button.parentElement;
      entry.classList.toggle('open');
      button.setAttribute('aria-expanded', String(entry.classList.contains('open')));
    });
  });
}

function parseExercise(line) {
  const cleanLine = line.replace(/\s+/g, ' ').trim();

  if (!cleanLine) {
    return null;
  }

  const pattern = /^(.*?)\s*\|\s*(\d+)\s*x\s*(\d+)\s*@\s*([^\|]+)$/i;
  const match = cleanLine.match(pattern);

  if (match) {
    const [, name, sets, reps, weightText] = match;
    return {
      name: name.trim(),
      sets: Number(sets),
      reps: Number(reps),
      weight: parseWeight(weightText)
    };
  }

  const fallback = cleanLine.split(/\s*[-–:]\s*/);
  if (fallback.length >= 2) {
    return {
      name: fallback[0].trim(),
      sets: 1,
      reps: Number(fallback[1]) || 1,
      weight: 0
    };
  }

  return {
    name: cleanLine,
    sets: 1,
    reps: 1,
    weight: 0
  };
}

function parseWeight(value) {
  const cleaned = value.trim().toLowerCase().replace(/kg|lb|lbs/g, '').trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function calculateVolume(exercises) {
  if (!Array.isArray(exercises) || !exercises.length) {
    return 0;
  }

  return exercises.reduce((sum, exercise) => {
    if (!exercise) {
      return sum;
    }

    if (Array.isArray(exercise.sets)) {
      return sum + calculateExerciseVolume(exercise.sets);
    }

    const sets = Number(exercise.sets) || 1;
    const reps = Number(exercise.reps) || 1;
    const weight = Number(exercise.weight) || 0;
    return sum + sets * reps * weight;
  }, 0);
}

function formatVolume(value) {
  return `${Math.round(value).toLocaleString()} kg`;
}

function calculateStreak() {
  const uniqueDates = [...new Set(state.workouts.map((workout) => normalizeDateValue(workout.date)))].sort((a, b) => new Date(b) - new Date(a));
  if (!uniqueDates.length) {
    return 0;
  }

  let streak = 0;
  const today = new Date();
  const cursor = new Date(today);

  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (uniqueDates.includes(iso)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function formatDate(dateString) {
  const iso = normalizeDateValue(dateString);
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
