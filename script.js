'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #CRUD = 'C';
  #crudworkout;
  #markers = [];
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE, clean = false) {
    this.#mapEvent = mapE;
    this._cleanForm();
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#CRUD = 'C';
  }

  _hideForm() {
    // Empty inputs
    this._cleanForm();
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _cleanForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let lat = this.#mapEvent ? this.#mapEvent.latlng.lat : undefined;
    let lng = this.#mapEvent ? this.#mapEvent.latlng.lng : undefined;
    let workout;

    if (this.#CRUD === 'C') {
      // If workout running, create running object
      if (type === 'running') {
        const cadence = +inputCadence.value;

        // Check if data is valid
        if (
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        )
          return alert('Inputs have to be positive numbers!');

        workout = new Running([lat, lng], distance, duration, cadence);
      }

      // If workout cycling, create cycling object
      if (type === 'cycling') {
        const elevation = +inputElevation.value;

        if (
          !validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration)
        )
          return alert('Inputs have to be positive numbers!');

        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      // Add new object to workout array
      this.#workouts.push(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkout(workout);

      // Set local storage to all workouts
      this._setLocalStorage();
    }
    if (this.#CRUD === 'U') {
      this.#CRUD === 'C';
      const workoutToUpdate = this.#workouts.at(this.#crudworkout.index);
      [lat, lng] = this.#crudworkout.coords;
      if (type === 'running') {
        // reading current workout

        const cadence = +inputCadence.value;
        if (type === this.#crudworkout.type) {
          workoutToUpdate.distance = distance;
          workoutToUpdate.duration = duration;
          workoutToUpdate.cadence = cadence;
        } else {
          // TODO: case 2 -> still must refresh marker popup
          const cadence = +inputCadence.value;
          // Check if data is valid
          if (
            !validInputs(distance, duration, cadence) ||
            !allPositive(distance, duration, cadence)
          )
            return alert('Inputs have to be positive numbers!');

          workout = new Running([lat, lng], distance, duration, cadence);
          this.#workouts.splice(this.#crudworkout.index, 1, workout);
        }
      } else if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (type === workoutToUpdate.type) {
          workoutToUpdate.distance = distance;
          workoutToUpdate.duration = duration;
          workoutToUpdate.elevationGain = elevation;
        } else {
          // TODO: case 3 -> still must refresh marker popup
          const elevation = +inputElevation.value;

          if (
            !validInputs(distance, duration, elevation) ||
            !allPositive(distance, duration)
          )
            return alert('Inputs have to be positive numbers!');

          workout = new Cycling([lat, lng], distance, duration, elevation);
          this.#workouts.splice(this.#crudworkout.index, 1, workout);
        }
      }
      console.log(this.#crudworkout);
      console.log(this.#workouts);
      this._refreshWorouts();
    }

    // Hide form + clear input fields
    this._hideForm();
  }

  _renderWorkoutMarker(workout) {
    const womarker = L.marker(workout.coords);
    womarker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    this.#markers.push({ id: '${workout.id}', marker: womarker });
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _deleteWorkoutByid(e) {
    const idl = e.target.dataset.id.slice(1);
    if (confirm('Are you sure about delete it!') == true) {
      // this.#workouts = this.#workouts.filter(val => val.id != idl);
      const workoutToDelete = this.#workouts.find(el => el.id === idl);
      // workoutToDelete.marker.remove(this.#map);
      const indexDelete = this.#workouts.findIndex(
        el => el.id === workoutToDelete.id
      );
      this.#workouts.splice(indexDelete, 1);

      this.#map.removeLayer(this.#markers.at(indexDelete).marker);
      this.#markers.splice(indexDelete, 1);

      this._refreshWorouts();
    } else {
      console.log('You canceled!');
    }
    return this.#workouts;
  }

  _updateWorkoutByid(e) {
    const lid = e.target.dataset.id.slice(1);
    this.#crudworkout = this.#workouts.find(val => val.id === lid);
    const index = this.#workouts.indexOf(this.#crudworkout);
    this.#crudworkout.index = index;
    this.#CRUD = 'U';
    form.classList.remove('hidden');
    inputDistance.focus();

    //Show current information

    inputDistance.value = this.#crudworkout.distance + '';
    inputDuration.value = this.#crudworkout.duration + '';
    inputType.value = this.#crudworkout.type;

    // hide both fields before choosing one
    if (
      !inputElevation
        .closest('.form__row')
        .classList.contains('form__row--hidden')
    )
      inputElevation.closest('.form__row').classList.add('form__row--hidden');

    if (
      !inputCadence
        .closest('.form__row')
        .classList.contains('form__row--hidden')
    )
      inputCadence.closest('.form__row').classList.add('form__row--hidden');

    if (this.#crudworkout.type === 'running') {
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputCadence.value = this.#crudworkout.cadence + '';
    } else if (this.#crudworkout.type === 'cycling') {
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputElevation.value = this.#crudworkout.elevationGain + '';
    }
  }

  _removeWorkoutMenu() {
    let btns = document.querySelectorAll('.form__btn__CRUD');
    btns.forEach(btn => btn.remove());
  }

  _addWorkoutMenu(workoutEl, e) {
    this._removeWorkoutMenu();
    const html = `<button title="Delete" type="button" class='form__btn__CRUD btn__Wdelete' data-id="D${workoutEl.dataset.id}">⛔</button>
    <button title="Update" type="button" class='form__btn__CRUD btn__Wupdate' data-id="U${workoutEl.dataset.id}">⭕</button>`;
    e.target.closest('.workout').insertAdjacentHTML('beforebegin', html);
    const btns = document.querySelectorAll('.form__btn__CRUD');
    btns[0].addEventListener('click', this._deleteWorkoutByid.bind(this));
    btns[1].addEventListener('click', this._updateWorkoutByid.bind(this));
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Show menu
    this._addWorkoutMenu(workoutEl, e);

    this._hideForm();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _refreshWorouts() {
    localStorage.removeItem('workouts');
    this._setLocalStorage();

    this._removeWorkoutMenu();
    // First lets remove all the workouts
    let workos = document.querySelectorAll('.workout');
    workos.forEach(wo => wo.remove());
    this._getLocalStorage();
  }
}

const app = new App();
