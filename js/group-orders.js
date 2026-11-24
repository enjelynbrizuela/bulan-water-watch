const currentUser = sessionStorage.getItem("waterWatchCurrentUser");
const token = sessionStorage.getItem("waterWatchToken");

if (!currentUser || !token) {
    window.location.href = "login.html";
}

const user = JSON.parse(currentUser);

const createdGroupsContainer = document.getElementById("createdGroups");
const noGroups = document.getElementById("noGroups");

const successModal = document.getElementById("successModal");
const errorModal = document.getElementById("errorModal");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

 

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (response.status === 401) {
        sessionStorage.removeItem("waterWatchToken");
        sessionStorage.removeItem("waterWatchCurrentUser");
        window.location.href = "login.html";
        throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

 

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}
 

function formatDate(value) {
    if (!value) return "Not available";

    let dateValue = value;

     if (typeof value === "string" && !value.includes("T")) {
        dateValue = value.replace(" ", "T");
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}
 

async function displayCreatedGroups() {
    createdGroupsContainer.innerHTML = "";
    noGroups.style.display = "none";

    try {
        const data = await apiRequest("/api/group-orders");
        const groups = data.groups || [];

        const availableGroups = groups.filter(group => {
            const deadline = new Date(
                String(group.deadline).replace(" ", "T")
            );

            return (
                String(group.status).toLowerCase() === "open" &&
                String(group.adminStatus).toLowerCase() === "pending" &&
                !Number.isNaN(deadline.getTime()) &&
                deadline.getTime() > Date.now()
            );
        });

        if (availableGroups.length === 0) {
            noGroups.style.display = "block";
            return;
        }

        availableGroups.forEach(group => {
            createGroupCard(group);
        });

    } catch (error) {
        console.error("Loading group orders error:", error);

        noGroups.style.display = "block";
        noGroups.querySelector("h3").textContent = "Unable to load group orders";
        noGroups.querySelector("p").textContent = error.message;
    }
}

  

function createGroupCard(group) {
    const card = document.createElement("section");
    card.className = "group-card";

    const participantCount = Number(group.participantCount || group.participants || 0);
    const maxParticipants = Number(group.maxParticipants || 0);

    let actionContent = "";

    if (Number(group.isCreator) === 1 || group.isCreator === true) {
        actionContent = `
            <p class="creator-label">
                You created this group.
            </p>
        `;
    } else if (Number(group.alreadyJoined) === 1 || group.alreadyJoined === true) {
        actionContent = `
            <p class="creator-label">
                You already joined this group.
            </p>
        `;
    } else {
        actionContent = `
            <div class="join-section">
                <div class="quantity-group">
                    <label>Your quantity (gallons)</label>
                    <input
                        type="number"
                        class="group-quantity"
                        min="1"
                        max="20"
                        value="1"
                    >
                </div>

                <button type="button" class="join-btn">
                    Join group
                </button>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="group-heading">
            <h2>
                ${escapeHTML(group.station)} ·
                ${escapeHTML(group.orderType)}
            </h2>
            <span class="status">OPEN</span>
        </div>

        <p class="deadline">
            Deadline: ${formatDate(group.deadline)}
        </p>

        <p>
            <strong>Created by:</strong>
            ${escapeHTML(group.createdBy || "User")}
        </p>

        <p>
            <strong>Price:</strong>
            ₱${Number(group.price || 0).toFixed(2)} per gallon
        </p>

        <p>
            <strong>Minimum gallons:</strong>
            ${Number(group.minimumGallons || 0)}
        </p>

        <p>
            <strong>Participants:</strong>
            ${participantCount} / ${maxParticipants}
        </p>

        ${group.notes ? `
            <p>
                <strong>Notes:</strong>
                ${escapeHTML(group.notes)}
            </p>
        ` : ""}

        ${actionContent}
    `;

    const joinButton = card.querySelector(".join-btn");

    if (joinButton) {
        joinButton.addEventListener("click", () => {
            joinGroup(group, card, joinButton);
        });
    }

    createdGroupsContainer.appendChild(card);
}

 

async function joinGroup(group, card, button) {
    const quantityInput = card.querySelector(".group-quantity");
    const quantity = Number(quantityInput.value);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        showError("Please enter a quantity between 1 and 20 gallons.");
        return;
    }

    button.disabled = true;
    button.textContent = "Joining...";

    try {
        const data = await apiRequest(
            `/api/group-orders/${group.id}/join`,
            {
                method: "POST",
                body: JSON.stringify({ quantity })
            }
        );

        successMessage.textContent =
            `You have joined ${group.station} with ${quantity} gallon(s).`;

        successModal.classList.add("show");

    } catch (error) {
        showError(error.message);

        button.disabled = false;
        button.textContent = "Join group";
    }
}

 
function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.add("show");
}

 

document.getElementById("successContinue").addEventListener("click", () => {
    successModal.classList.remove("show");
    displayCreatedGroups();
});

document.getElementById("closeError").addEventListener("click", () => {
    errorModal.classList.remove("show");
});

[successModal, errorModal].forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });
});

 

document.getElementById("newGroupBtn").addEventListener("click", () => {
    window.location.href = "create-group-order.html";
});

 

displayCreatedGroups();
