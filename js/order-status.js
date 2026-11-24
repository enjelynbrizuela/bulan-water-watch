
const API_BASE_URL = "/api";

const token = sessionStorage.getItem("waterWatchToken");
const currentUser = sessionStorage.getItem("waterWatchCurrentUser");

if (!currentUser || !token) {
    window.location.href = "login.html";
    throw new Error("User is not logged in.");
}

let user;

try {
    user = JSON.parse(currentUser);
} catch (error) {
    sessionStorage.clear();
    window.location.href = "login.html";
    throw new Error("Invalid user session.");
}
 
const ordersList = document.getElementById("ordersList");
const selectedOrder = document.getElementById("selectedOrder");

const selectedReference = document.getElementById("selectedReference");
const selectedDetails = document.getElementById("selectedDetails");
const selectedStatus = document.getElementById("selectedStatus");

const participantsList = document.getElementById("participantsList");
const progressSteps = selectedOrder.querySelectorAll(".progress-step");
const rejectedStatus = document.getElementById("rejectedStatus");

const cancelParticipationBtn = document.getElementById("cancelParticipation");

const confirmModal = document.getElementById("confirmModal");
const successModal = document.getElementById("successModal");

const keepOrderBtn = document.getElementById("keepOrder");
const confirmCancelBtn = document.getElementById("confirmCancel");
const successContinueBtn = document.getElementById("successContinue");
 
let myOrders = [];
let selectedTicket = null;
 

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error("Invalid response from server.");
    }

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
} 

function getCurrentStatus(order) {
    const adminStatus = String(order.adminStatus || "")
        .trim()
        .toLowerCase();

    const groupStatus = String(order.groupStatus || "")
        .trim()
        .toLowerCase();

    if (adminStatus === "approved") return "completed";
    if (adminStatus === "rejected") return "rejected";

    if (groupStatus === "rejected") return "rejected";
    if (groupStatus === "completed") return "completed";

    if (
        groupStatus === "confirmation" ||
        groupStatus === "closed"
    ) {
        return "confirmation";
    }

    return "open";
}

function getStatusLabel(status, order) {
    if (status === "completed") {
        return String(order.adminStatus || "").toLowerCase() === "approved"
            ? "Approved"
            : "Completed";
    }

    if (status === "rejected") return "Rejected";
    if (status === "confirmation") return "Confirmation";

    return "Pending / Open";
} 
async function loadMyOrders() {
    try {
        selectedTicket = null;

        selectedOrder.style.display = "none";
        ordersList.style.display = "block";

        ordersList.innerHTML = "<p>Loading your orders...</p>";

        const data = await apiRequest("/my-orders");

        myOrders = Array.isArray(data.orders) ? data.orders : [];

        myOrders.sort((a, b) => {
            return new Date(b.dateJoined || 0) -
                   new Date(a.dateJoined || 0);
        });

        displayOrdersList();

    } catch (error) {
        console.error("Error loading orders:", error);

        ordersList.innerHTML = `
            <div class="empty-orders">
                <h3>Unable to Load Orders</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
} 

function displayOrdersList() {

     selectedOrder.style.display = "none";
    ordersList.style.display = "block";

    ordersList.innerHTML = "";

    if (myOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-orders">
                <h3>No Orders Yet</h3>
                <p>You have not joined any group order.</p>
            </div>
        `;
        return;
    }

    myOrders.forEach((order, index) => {

        const status = getCurrentStatus(order);

        const reference =
            order.groupReference ||
            order.participantReference ||
            order.groupId ||
            "N/A";

        const card = document.createElement("div");
        card.className = "customer-order-card";

        card.innerHTML = `
            <div class="order-card-header">
                <div>
                    <p class="order-number">ORDER ${index + 1}</p>
                    <h3>${escapeHTML(reference)}</h3>
                </div>

                <span class="status-badge ${status}">
                    ${escapeHTML(getStatusLabel(status, order))}
                </span>
            </div>

            <p class="ticket-station">
                ${escapeHTML(order.station || "Unknown Station")}
            </p>

            <button type="button" class="view-status-btn">
                View Details
            </button>
        `;

        card.querySelector(".view-status-btn").addEventListener("click", () => {
            viewSelectedOrder(order);
        });

        ordersList.appendChild(card);
    });
}
 

async function viewSelectedOrder(order) {

    selectedTicket = order;

     ordersList.style.display = "none";
    ordersList.innerHTML = "";

     selectedOrder.style.display = "block";

    const status = getCurrentStatus(order);

    const reference =
        order.groupReference ||
        order.participantReference ||
        order.groupId ||
        "N/A";

    const station = order.station || "Unknown Station";
    const address = order.stationAddress || "Address unavailable";
    const price = Number(order.price || 0);
    const quantity = Number(order.quantity || 0);
    const orderType = order.orderType || "Not specified";

    selectedReference.textContent = reference;

    selectedDetails.textContent =
        `${station} · ${address} · ${quantity} ` +
        `${quantity === 1 ? "gallon" : "gallons"} · ` +
        `₱${price.toFixed(2)} per gallon · ${orderType}`;

    selectedStatus.textContent = getStatusLabel(status, order);
    selectedStatus.className = `status-badge ${status}`;

    updateProgress(status);

    cancelParticipationBtn.style.display =
        status === "open" ? "block" : "none";

    participantsList.innerHTML = "<p>Loading participants...</p>";

    await loadParticipants(order.groupId);
}

function updateProgress(status) {

    rejectedStatus.classList.remove("show");

    progressSteps.forEach(step => {
        step.style.display = "flex";
        step.classList.remove("active", "completed");
    });

    if (status === "rejected") {

        progressSteps.forEach(step => {
            step.style.display = "none";
        });

        rejectedStatus.classList.add("show");
        return;
    }

    const statuses = [
        "open",
        "confirmation",
        "completed"
    ];

    const currentIndex = statuses.indexOf(status);

    progressSteps.forEach(step => {

        const stepIndex = statuses.indexOf(step.dataset.status);

        if (stepIndex < currentIndex) {
            step.classList.add("completed");
        }

        if (stepIndex === currentIndex) {
            step.classList.add("active");
        }
    });
}

 

async function loadParticipants(groupId) {
    participantsList.innerHTML = "<p>Loading participants...</p>";

    const id = Number(groupId);

    if (!Number.isInteger(id) || id < 1) {
        participantsList.innerHTML = "<p>Invalid group order ID.</p>";
        return;
    }

    try {
        const data = await apiRequest(
            `/group-orders/${id}/participants`
        );

         if (
            !selectedTicket ||
            Number(selectedTicket.groupId) !== id
        ) {
            return;
        }

        const participants = Array.isArray(data.participants)
            ? data.participants
            : [];

        participantsList.innerHTML = "";

        if (participants.length === 0) {
            participantsList.innerHTML = "<p>No participants found.</p>";
            return;
        }

        participants.forEach(participant => {
            const name =
                participant.fullname ||
                participant.name ||
                "Customer";

            const quantity = Number(participant.quantity || 0);

            const isCurrentUser =
                participant.user_id !== undefined
                    ? String(participant.user_id) === String(user.id)
                    : (
                        participant.email &&
                        user.email &&
                        participant.email.toLowerCase() ===
                        user.email.toLowerCase()
                    );

            const item = document.createElement("p");

            item.textContent =
                `${isCurrentUser ? "You" : name} · ` +
                `${quantity} ${quantity === 1 ? "gallon" : "gallons"} · ` +
                `${participant.status || participant.participantStatus || "Joined"}`;

            participantsList.appendChild(item);
        });

    } catch (error) {
        console.error("Participants error:", error);

        participantsList.innerHTML = `
            <p>Unable to load participants.</p>
        `;
    }
}


 

function getCurrentStatus(order) {
    const adminStatus = String(order.adminStatus || "")
        .trim()
        .toLowerCase();

    const groupStatus = String(order.groupStatus || "")
        .trim()
        .toLowerCase();

    if (adminStatus === "approved") return "completed";
    if (adminStatus === "rejected") return "rejected";

    if (groupStatus === "rejected") return "rejected";
    if (groupStatus === "completed") return "completed";

    if (
        groupStatus === "confirmation" ||
        groupStatus === "closed"
    ) {
        return "confirmation";
    }

    return "open";
}

function getStatusLabel(status, order) {
    if (status === "completed") {
        return String(order.adminStatus || "").toLowerCase() === "approved"
            ? "Approved"
            : "Completed";
    }

    if (status === "rejected") return "Rejected";
    if (status === "confirmation") return "Confirmation";

    return "Pending / Open";
}
 

async function loadMyOrders() {
    try {
        selectedTicket = null;

         selectedOrder.hidden = true;
        ordersList.hidden = false;

        ordersList.innerHTML = "<p>Loading your orders...</p>";

        const data = await apiRequest("/my-orders");

        myOrders = Array.isArray(data.orders) ? data.orders : [];

        myOrders.sort((a, b) => {
            return new Date(b.dateJoined || 0) -
                   new Date(a.dateJoined || 0);
        });

        displayOrdersList();

    } catch (error) {
        console.error("Error loading orders:", error);

        ordersList.hidden = false;
        selectedOrder.hidden = true;

        ordersList.innerHTML = `
            <div class="empty-orders">
                <h3>Unable to Load Orders</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}
 

function displayOrdersList() {

    selectedOrder.hidden = true;
    ordersList.hidden = false;

    ordersList.innerHTML = "";

    if (myOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-orders">
                <h3>No Orders Yet</h3>
                <p>You have not joined any group order.</p>
            </div>
        `;
        return;
    }

    myOrders.forEach((order, index) => {

        const status = getCurrentStatus(order);

        const reference =
            order.groupReference ||
            order.participantReference ||
            order.groupId ||
            "N/A";

        const card = document.createElement("div");
        card.className = "customer-order-card";

        card.innerHTML = `
            <div class="order-card-header">
                <div>
                    <p class="order-number">ORDER ${index + 1}</p>
                    <h3>${escapeHTML(reference)}</h3>
                </div>

                <span class="status-badge ${status}">
                    ${escapeHTML(getStatusLabel(status, order))}
                </span>
            </div>

            <p class="ticket-station">
                ${escapeHTML(order.station || "Unknown Station")}
            </p>

            <button type="button" class="view-status-btn">
                View Details
            </button>
        `;

        card.querySelector(".view-status-btn").addEventListener("click", () => {
            viewSelectedOrder(order);
        });

        ordersList.appendChild(card);
    });
}

 
async function viewSelectedOrder(order) {

    if (!order) return;

    selectedTicket = order;

     ordersList.hidden = true;
    ordersList.style.display = "none";

     selectedOrder.hidden = false;
    selectedOrder.style.display = "block";

    const status = getCurrentStatus(order);

    const reference =
        order.groupReference ||
        order.participantReference ||
        order.groupId ||
        "N/A";

    const station = order.station || "Unknown Station";
    const address = order.stationAddress || "Address unavailable";
    const price = Number(order.price || 0);
    const quantity = Number(order.quantity || 0);
    const orderType = order.orderType || "Not specified";

    selectedReference.textContent = reference;

    selectedDetails.textContent =
        `${station} · ${address} · ${quantity} ` +
        `${quantity === 1 ? "gallon" : "gallons"} · ` +
        `₱${price.toFixed(2)} per gallon · ${orderType}`;

    selectedStatus.textContent = getStatusLabel(status, order);
    selectedStatus.className = `status-badge ${status}`;

    updateProgress(status);

    cancelParticipationBtn.hidden = status !== "open";

    participantsList.innerHTML = "<p>Loading participants...</p>";

    await loadParticipants(order.groupId);
}


function updateProgress(status) {

    rejectedStatus.classList.remove("show");

    progressSteps.forEach(step => {
        step.style.display = "flex";
        step.classList.remove("active", "completed");
    });

    if (status === "rejected") {

        progressSteps.forEach(step => {
            step.style.display = "none";
        });

        rejectedStatus.classList.add("show");
        return;
    }

    const statuses = [
        "open",
        "confirmation",
        "completed"
    ];

    const currentIndex = statuses.indexOf(status);

    progressSteps.forEach(step => {

        const stepIndex = statuses.indexOf(step.dataset.status);

        if (stepIndex < currentIndex) {
            step.classList.add("completed");
        }

        if (stepIndex === currentIndex) {
            step.classList.add("active");
        }
    });
}
 

async function loadParticipants(groupId) {

    participantsList.innerHTML = "<p>Loading participants...</p>";

    const id = Number(groupId);

    if (!Number.isInteger(id) || id < 1) {
        participantsList.innerHTML = "<p>Invalid group order ID.</p>";
        return;
    }

    try {
        const data = await apiRequest(
            `/group-orders/${id}/participants`
        );

        if (
            !selectedTicket ||
            Number(selectedTicket.groupId) !== id
        ) {
            return;
        }

        const participants = Array.isArray(data.participants)
            ? data.participants
            : [];

        participantsList.innerHTML = "";

        if (participants.length === 0) {
            participantsList.innerHTML = "<p>No participants found.</p>";
            return;
        }

        participants.forEach(participant => {

            const name =
                participant.fullname ||
                participant.name ||
                "Customer";

            const quantity = Number(participant.quantity || 0);

            const isCurrentUser =
                participant.user_id !== undefined
                    ? String(participant.user_id) === String(user.id)
                    : (
                        participant.email &&
                        user.email &&
                        participant.email.toLowerCase() ===
                        user.email.toLowerCase()
                    );

            const item = document.createElement("p");

            item.textContent =
                `${isCurrentUser ? "You" : name} · ` +
                `${quantity} ${quantity === 1 ? "gallon" : "gallons"} · ` +
                `${participant.status || participant.participantStatus || "Joined"}`;

            participantsList.appendChild(item);
        });

    } catch (error) {
        console.error("Participants error:", error);
        participantsList.innerHTML = "<p>Unable to load participants.</p>";
    }
}
 

cancelParticipationBtn.addEventListener("click", function() {

    if (!selectedTicket || getCurrentStatus(selectedTicket) !== "open") {
        return;
    }

    confirmModal.classList.add("show");
});

keepOrderBtn.addEventListener("click", function() {
    confirmModal.classList.remove("show");
});

confirmCancelBtn.addEventListener("click", async function() {

    if (!selectedTicket) {
        confirmModal.classList.remove("show");
        return;
    }

    try {
        confirmCancelBtn.disabled = true;
        confirmCancelBtn.textContent = "Cancelling...";

        await apiRequest(
            `/group-orders/${selectedTicket.groupId}/leave`,
            {
                method: "DELETE"
            }
        );

        confirmModal.classList.remove("show");
        successModal.classList.add("show");

    } catch (error) {
        console.error("Cancel error:", error);
        alert(error.message || "Unable to cancel participation.");

    } finally {
        confirmCancelBtn.disabled = false;
        confirmCancelBtn.textContent = "Yes, Cancel Participation";
    }
}); 

successContinueBtn.addEventListener("click", function() {

    successModal.classList.remove("show");

    selectedTicket = null;

    loadMyOrders();
});
 
[confirmModal, successModal].forEach(modal => {

    modal.addEventListener("click", function(event) {

        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });
});

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}


document.addEventListener("visibilitychange", function() {
    if (!document.hidden && !selectedTicket) {
        loadMyOrders();
    }
});


loadMyOrders();
