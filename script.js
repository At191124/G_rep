const STORAGE_KEY = 'training-dashboard-workouts';

const defaultWorkouts = [
  {
    id: 1,
    date: '2026-08-21',
    type: 'strength',
    name: 'Upper Body Power',
    duration: 72,
    notes: 'Strong bench press work and slow eccentric pull-ups. Kept the rest intervals tight.',
    exercises: [
      { name: 'Bench Press', sets: 5, reps: 5, weight: 95 },
      { name: 'Pull-Ups', sets: 4, reps: 8, weight: 0 },
      { name: 'Dumbbell Rows', sets: 4, reps: 10, weight: 32 }
    ]
  },
  {
    id: 2,
    date: '2026-08-18',
    type: 'cardio',
    name: 'Tempo Run',
    duration: 48,
    notes: 'Controlled effort. Breathing stayed steady after the first 15 minutes.',
    exercises: [
      { name: 'Treadmill Run', sets: 1, reps: 1, weight: 0 },
      { name: 'Row Intervals', sets: 5, reps: 500, weight: 0 },
      { name: 'Cool Down Walk', sets: 1, reps: 8, weight: 0 }
    ]
  },
  {
    id: 3,
    date: '2026-08-16',
    type: 'mobility',
    name: 'Recovery Reset',
    duration: 35,
    notes: 'Focused on hips, thoracic rotation, and lower back mobility.',
    exercises: [
      { name: 'Hip Openers', sets: 2, reps: 10, weight: 0 },
      { name: 'Thoracic Rotation', sets: 2, reps: 8, weight: 0 },
      { name: 'Foam Rolling', sets: 1, reps: 15, weight: 0 }
    ]
  },
  {
    id: 4,
    date: '2026-08-12',
    type: 'hiit',
    name: 'MetCon Circuit',
    duration: 32,
    notes: 'The burpees were the limiter. Kept transitions sharp between rounds.',
    exercises: [
      { name: 'Burpees', sets: 5, reps: 12, weight: 0 },
      { name: 'Kettlebell Swings', sets: 4, reps: 15, weight: 24 },
      { name: 'Mountain Climbers', sets: 4, reps: 20, weight: 0 }
    ]
  }
];

const state = {
  filter: 'all',
  workouts: readWorkouts()
};

const typeLabels = {
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  hiit: 'HIIT'
};

const form = document.getElementById('log-form');
const workoutList = document.getElementById('workout-list');
const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
const weeklyChart = document.getElementById('weekly-chart');

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

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderWorkouts();
  });
});

document.getElementById('reset-demo').addEventListener('click', () => {
  state.workouts = structuredClone(defaultWorkouts);
  saveWorkouts();
  render();
});

render();

function readWorkouts() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorkouts));
    return structuredClone(defaultWorkouts);
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorkouts));
    return structuredClone(defaultWorkouts);
  }
}

function saveWorkouts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.workouts));
}

function render() {
  renderSummary();
  renderWeeklyChart();
  renderWorkouts();
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
    const matchingDay = chartDays.find((day) => day.iso === workout.date);
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

function renderWorkouts() {
  const filteredWorkouts = state.filter === 'all'
    ? state.workouts
    : state.workouts.filter((workout) => workout.type === state.filter);

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
                  .map(
                    (exercise) => `
                      <li>
                        <div>
                          <div class="exercise-name">${escapeHtml(exercise.name)}</div>
                          <div class="exercise-meta">${exercise.sets || 1} sets • ${exercise.reps || 1} reps</div>
                        </div>
                        <strong>${exercise.weight ? `${exercise.weight} kg` : 'Bodyweight'}</strong>
                      </li>
                    `
                  )
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
  const uniqueDates = [...new Set(state.workouts.map((workout) => workout.date))].sort((a, b) => new Date(b) - new Date(a));
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
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
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
