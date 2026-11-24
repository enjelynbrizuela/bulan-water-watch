
const currentUser = sessionStorage.getItem("waterWatchCurrentUser");
const token = sessionStorage.getItem("waterWatchToken");

if (!currentUser || !token) {
    window.location.href = "login.html";
    throw new Error("Login required.");
}

try {
    JSON.parse(currentUser);
} catch (error) {
    sessionStorage.removeItem("waterWatchCurrentUser");
    sessionStorage.removeItem("waterWatchToken");
    window.location.href = "login.html";
    throw error;
}

const form = document.getElementById("groupOrderForm");
const stationSelect = document.getElementById("station");
const priceDisplay = document.getElementById("priceDisplay");
const deadlineInput = document.getElementById("deadline");

const successModal = document.getElementById("successModal");
const errorModal = document.getElementById("errorModal");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const successContinue = document.getElementById("successContinue");
const closeError = document.getElementById("closeError");

const minimumGallonsInput = document.getElementById("minimumGallons");
const maxParticipantsInput = document.getElementById("maxParticipants");
const notesInput = document.getElementById("notes");

let waterStations = [];
let isSubmitting = false;

 async function loadStations() {
    stationSelect.innerHTML =
        '<option value="">Loading water stations...</option>';

    stationSelect.disabled = true;

    try {
        const response = await fetch("/api/stations");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load stations.");
        }

        waterStations = data.stations || [];

        stationSelect.innerHTML =
            '<option value="">Choose a water station</option>';

        waterStations.forEach(station => {
            const option = document.createElement("option");

            option.value = station.id;
            option.textContent =
                `${station.name} - ₱${Number(station.price).toFixed(2)}/gallon`;

            option.dataset.price = station.price;

            stationSelect.appendChild(option);
        });

        stationSelect.disabled = false;

         const savedStation = sessionStorage.getItem("selectedWaterStation");

        if (savedStation) {
            const selected = JSON.parse(savedStation);

            const matchingStation = waterStations.find(station =>
                String(station.id) === String(selected.id)
            );

            if (matchingStation) {
                stationSelect.value = matchingStation.id;
            }
        }

        updatePrice();

        if (waterStations.length === 0) {
            stationSelect.innerHTML =
                '<option value="">No water stations available</option>';
            stationSelect.disabled = true;
        }

    } catch (error) {
        console.error("Station loading error:", error);

        stationSelect.innerHTML =
            '<option value="">Unable to load stations</option>';

        stationSelect.disabled = true;

        showError(error.message);
    }
}

 function updatePrice() {
    const selectedOption =
        stationSelect.options[stationSelect.selectedIndex];

    const price = Number(selectedOption?.dataset.price || 0);

    priceDisplay.textContent = "₱" + price.toFixed(2);
}

stationSelect.addEventListener("change", updatePrice);

 if (deadlineInput) {
    const now = new Date();

    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 16);

    deadlineInput.min = localDate;
}

 function showError(message) {
    errorMessage.textContent = message;

    if (errorModal) {
        errorModal.classList.add("show");
    } else {
        alert(message);
    }
}

 form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (isSubmitting) return;

    const currentToken = sessionStorage.getItem("waterWatchToken");

    if (!currentToken) {
        window.location.href = "login.html";
        return;
    }

    const stationId = Number(stationSelect.value);

    const station = waterStations.find(item =>
        Number(item.id) === stationId
    );

    const selectedOrderType = document.querySelector(
        'input[name="orderType"]:checked'
    );

    const deadline = deadlineInput.value;
    const minimumGallons = Number(minimumGallonsInput.value);
    const maxParticipants = Number(maxParticipantsInput.value);
    const notes = notesInput.value.trim();

    if (!station) {
        showError("Please select a water station.");
        return;
    }

    if (!selectedOrderType) {
        showError("Please select Pickup or Delivery.");
        return;
    }

    if (!deadline || new Date(deadline) <= new Date()) {
        showError("Please select a future deadline.");
        return;
    }

    if (
        !Number.isInteger(minimumGallons) ||
        minimumGallons < 1 ||
        minimumGallons > 100
    ) {
        showError("Minimum gallons must be between 1 and 100.");
        return;
    }

    if (
        !Number.isInteger(maxParticipants) ||
        maxParticipants < 2 ||
        maxParticipants > 50
    ) {
        showError("Maximum participants must be between 2 and 50.");
        return;
    }

    const groupOrderData = {
        stationId: station.id,
        orderType: selectedOrderType.value,
        deadline,
        minimumGallons,
        maxParticipants,
        notes
    };

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    try {
        const response = await fetch("/api/group-orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + currentToken
            },
            body: JSON.stringify(groupOrderData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            if (response.status === 401) {
                sessionStorage.removeItem("waterWatchToken");
                sessionStorage.removeItem("waterWatchCurrentUser");
                window.location.href = "login.html";
                return;
            }

            throw new Error(data.message || "Unable to create group order.");
        }

        sessionStorage.setItem(
            "selectedCreatedGroup",
            JSON.stringify(data.group)
        );

        successMessage.textContent =
            `Your ${station.name} group order has been created successfully!`;

        successModal.classList.add("show");

        form.reset();
        updatePrice();

    } catch (error) {
        console.error("Create group order error:", error);
        showError(error.message);

    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});

 successContinue.addEventListener("click", function () {
    window.location.href = "group-orders.html";
});

 closeError.addEventListener("click", function () {
    errorModal.classList.remove("show");
});

errorModal.addEventListener("click", function (e) {
    if (e.target === errorModal) {
        errorModal.classList.remove("show");
    }
});

 loadStations();
