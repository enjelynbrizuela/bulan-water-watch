const API_BASE = "/api";

const token = sessionStorage.getItem("waterWatchToken");

let allOrders = [];
let selectedGroupId = null;
let selectedAction = null;
 

const stationOrdersContainer =
    document.getElementById("stationOrdersContainer");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const stationFilter =
    document.getElementById("stationFilter");

const refreshBtn =
    document.getElementById("refreshBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const detailsModal =
    document.getElementById("detailsModal");

const detailsContent =
    document.getElementById("detailsContent");

const closeDetailsBtn =
    document.getElementById("closeDetailsBtn");

const closeDetailsFooterBtn =
    document.getElementById("closeDetailsFooterBtn");

const confirmModal =
    document.getElementById("confirmModal");

const confirmIcon =
    document.getElementById("confirmIcon");

const confirmTitle =
    document.getElementById("confirmTitle");

const confirmMessage =
    document.getElementById("confirmMessage");

const cancelActionBtn =
    document.getElementById("cancelActionBtn");

const confirmActionBtn =
    document.getElementById("confirmActionBtn");

const successModal =
    document.getElementById("successModal");

const successTitle =
    document.getElementById("successTitle");

const successMessage =
    document.getElementById("successMessage");

const successCloseBtn =
    document.getElementById("successCloseBtn");

const logoutModal =
    document.getElementById("logoutModal");

const cancelLogoutBtn =
    document.getElementById("cancelLogoutBtn");

const confirmLogoutBtn =
    document.getElementById("confirmLogoutBtn");
 

function checkAdminSession() {
    const currentUser = sessionStorage.getItem(
        "waterWatchCurrentUser"
    );

    if (!token || !currentUser) {
        redirectToLogin();
        return false;
    }

    try {
        const user = JSON.parse(currentUser);

        if (String(user.role).toLowerCase() !== "admin") {
            redirectToLogin();
            return false;
        }

    } catch (error) {
        redirectToLogin();
        return false;
    }

    return true;
}

function redirectToLogin() {
    sessionStorage.removeItem("waterWatchCurrentUser");
    sessionStorage.removeItem("waterWatchToken");

    window.location.href = "../login.html";
}
 
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
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
        throw new Error("Invalid server response.");
    }

    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(data.message || "Your session has expired.");
    }

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}
 

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return replacements[char];
    });
}
  

function formatDate(dateValue) {
    if (!dateValue) {
        return "Not specified";
    }

    let value = String(dateValue);
 
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) {
        value = value.replace(" ", "T");
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return escapeHTML(dateValue);
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}
 

function getAdminStatus(group) {
    return group.adminStatus || "Pending";
}

function getStationName(group) {
    return group.station || "Unknown Water Station";
}
 

async function loadOrders() {
    if (!stationOrdersContainer) {
        return;
    }

    stationOrdersContainer.innerHTML = `
        <div class="loading-message">
            Loading customer orders...
        </div>
    `;

    if (emptyState) {
        emptyState.classList.remove("show");
    }

    try {
        const data = await apiRequest("/admin/group-orders");

        allOrders = Array.isArray(data.groups)
            ? data.groups
            : [];

        displayOrders();

    } catch (error) {
        console.error("Load orders error:", error);

        stationOrdersContainer.innerHTML = `
            <div class="loading-message">
                Unable to load orders.
                <br>
                ${escapeHTML(error.message)}
            </div>
        `;

        if (emptyState) {
            emptyState.classList.remove("show");
        }
    }
}
 

function getPendingOrders() {
    return allOrders.filter(group => {
        return String(getAdminStatus(group)).toLowerCase() === "pending";
    });
}
 

function displayOrders() {
    if (!stationOrdersContainer) {
        return;
    }

    const pendingOrders = getPendingOrders();

    const searchValue = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const selectedStation = stationFilter
        ? stationFilter.value
        : "all";

    const filteredOrders = pendingOrders.filter(group => {
        const customerName = String(
            group.createdBy || ""
        ).toLowerCase();

        const orderId = String(
            group.reference_id || group.id || ""
        ).toLowerCase();

        const stationName = getStationName(group);

        const matchesSearch =
            customerName.includes(searchValue) ||
            orderId.includes(searchValue) ||
            stationName.toLowerCase().includes(searchValue);

        const matchesStation =
            selectedStation === "all" ||
            stationName === selectedStation;

        return matchesSearch && matchesStation;
    });

    stationOrdersContainer.innerHTML = "";

    if (filteredOrders.length === 0) {
        if (emptyState) {
            emptyState.classList.add("show");
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.remove("show");
    }
 
    const groupedOrders = {};

    filteredOrders.forEach(group => {
        const stationName = getStationName(group);

        if (!groupedOrders[stationName]) {
            groupedOrders[stationName] = [];
        }

        groupedOrders[stationName].push(group);
    });

    Object.entries(groupedOrders).forEach(
        ([stationName, stationOrders]) => {

            const firstOrder = stationOrders[0];

            const stationAddress =
                firstOrder.station_address ||
                "Address not available";

            const stationSection =
                document.createElement("div");

            stationSection.className = "station-section";

            stationSection.innerHTML = `
                <div class="station-header">

                    <div class="station-title">

                        <div class="station-icon">
                            <i class="fa-solid fa-droplet"></i>
                        </div>

                        <div>
                            <h3>${escapeHTML(stationName)}</h3>
                            <p>${escapeHTML(stationAddress)}</p>
                        </div>

                    </div>

                    <span class="station-count">
                        ${stationOrders.length}
                        ${stationOrders.length === 1 ? "Order" : "Orders"}
                    </span>

                </div>

                <div class="station-order-list">
                    ${stationOrders.map(createOrderCard).join("")}
                </div>
            `;

            stationOrdersContainer.appendChild(stationSection);
        }
    );
}
 

function createOrderCard(group) {
    const customerName =
        group.createdBy || "Unknown Customer";

    const participants =
        Number(group.participantCount ?? group.participants ?? 1);

    const price = Number(group.price || 0);

    const orderReference =
        group.reference_id || group.id;

    return `
        <article class="order-card">

            <div class="order-card-top">

                <span class="order-id">
                    ${escapeHTML(orderReference)}
                </span>

                <span class="pending-badge">
                    <i class="fa-solid fa-clock"></i>
                    Pending
                </span>

            </div>

            <div class="order-info-item">
                <span>Customer</span>
                <strong>${escapeHTML(customerName)}</strong>
            </div>

            <div class="order-info-item">
                <span>Participants</span>
                <strong>
                    ${participants}
                    ${participants === 1 ? "Customer" : "Customers"}
                </strong>
            </div>

            <div class="order-info-item">
                <span>Price / Gallon</span>
                <strong>₱${price.toFixed(2)}</strong>
            </div>

            <div class="order-actions">

                <button
                    class="action-btn view-btn"
                    data-action="view"
                    data-id="${escapeHTML(group.id)}"
                >
                    View
                </button>

                <button
                    class="action-btn approve-btn"
                    data-action="approve"
                    data-id="${escapeHTML(group.id)}"
                >
                    Approve
                </button>

                <button
                    class="action-btn reject-btn"
                    data-action="reject"
                    data-id="${escapeHTML(group.id)}"
                >
                    Reject
                </button>

            </div>

        </article>
    `;
} 
async function viewOrderDetails(groupId) {
    const group = allOrders.find(item =>
        String(item.id) === String(groupId)
    );

    if (!group) {
        alert("Order not found.");
        return;
    }

    const price = Number(group.price || 0);

    detailsContent.innerHTML = `
        <div class="detail-section">
            <h3>Order Information</h3>

            <div class="detail-grid">

                <div class="detail-item">
                    <span>Order Reference</span>
                    <strong>${escapeHTML(group.reference_id || group.id)}</strong>
                </div>

                <div class="detail-item">
                    <span>Admin Status</span>
                    <strong>${escapeHTML(getAdminStatus(group))}</strong>
                </div>

                <div class="detail-item">
                    <span>Created By</span>
                    <strong>${escapeHTML(group.createdBy || "Unknown")}</strong>
                </div>

                <div class="detail-item">
                    <span>Email</span>
                    <strong>${escapeHTML(group.email || "Not provided")}</strong>
                </div>

                <div class="detail-item">
                    <span>Participants</span>
                    <strong>${Number(group.participantCount ?? group.participants ?? 0)}</strong>
                </div>

                <div class="detail-item">
                    <span>Total Gallons</span>
                    <strong>${Number(group.totalGallons || 0)}</strong>
                </div>

                <div class="detail-item">
                    <span>Price per Gallon</span>
                    <strong>₱${price.toFixed(2)}</strong>
                </div>

                <div class="detail-item">
                    <span>Order Type</span>
                    <strong>${escapeHTML(group.orderType || "Not specified")}</strong>
                </div>

                <div class="detail-item">
                    <span>Minimum Gallons</span>
                    <strong>${escapeHTML(group.minimumGallons ?? "Not specified")}</strong>
                </div>

                <div class="detail-item">
                    <span>Maximum Participants</span>
                    <strong>${escapeHTML(group.maxParticipants ?? "Not specified")}</strong>
                </div>

                <div class="detail-item">
                    <span>Deadline</span>
                    <strong>${formatDate(group.deadline)}</strong>
                </div>

                <div class="detail-item">
                    <span>Date Created</span>
                    <strong>${formatDate(group.dateCreated)}</strong>
                </div>

            </div>
        </div>

        <div class="detail-section">
            <h3>Water Station</h3>

            <div class="detail-grid">

                <div class="detail-item">
                    <span>Station Name</span>
                    <strong>${escapeHTML(getStationName(group))}</strong>
                </div>

                <div class="detail-item">
                    <span>Address</span>
                    <strong>${escapeHTML(group.station_address || "Not available")}</strong>
                </div>

            </div>
        </div>

        <div class="detail-section">
            <h3>Participants</h3>
            <div class="participant-list">
                <p>Loading participant details...</p>
            </div>
        </div>

        <div class="detail-section">
            <h3>Additional Notes</h3>

            <p style="font-size:11px;color:#536575;line-height:1.6;">
                ${escapeHTML(group.notes || "No additional notes.")}
            </p>
        </div>
    `;

    detailsModal.classList.add("show");
 
    try {
        const data = await apiRequest(
            `/admin/group-orders/${group.id}/participants`
        );

        const participants = Array.isArray(data.participants)
            ? data.participants
            : [];

        const participantList =
            detailsContent.querySelector(".participant-list");

        if (!participantList) {
            return;
        }

        if (participants.length === 0) {
            participantList.innerHTML = `
                <p style="font-size:11px;color:#8995a3;">
                    No participant details available.
                </p>
            `;

            return;
        }

        participantList.innerHTML = participants.map(
            (participant, index) => `
                <div class="participant-item">
                    <strong>
                        ${index + 1}. ${escapeHTML(participant.fullname || "Customer")}
                        ${Number(participant.is_creator) === 1 ? "(Creator)" : ""}
                    </strong>

                    <span>
                        ${Number(participant.quantity || 0)} Gallons
                    </span>
                </div>
            `
        ).join("");

    } catch (error) {
        console.error("Participant details error:", error);

        const participantList =
            detailsContent.querySelector(".participant-list");

        if (participantList) {
            participantList.innerHTML = `
                <p style="font-size:11px;color:#c84c4c;">
                    Unable to load participant details.
                </p>
            `;
        }
    }
}
 

function openActionConfirmation(groupId, action) {
    selectedGroupId = groupId;
    selectedAction = action;

    if (action === "approve") {
        confirmIcon.innerHTML =
            '<i class="fa-solid fa-circle-check"></i>';

        confirmTitle.textContent = "Approve Order";

        confirmMessage.textContent =
            "Are you sure you want to approve this group order?";

        confirmActionBtn.textContent = "Yes, Approve";
        confirmActionBtn.style.background = "#22864b";

    } else {
        confirmIcon.innerHTML =
            '<i class="fa-solid fa-circle-xmark"></i>';

        confirmTitle.textContent = "Reject Order";

        confirmMessage.textContent =
            "Are you sure you want to reject this group order?";

        confirmActionBtn.textContent = "Yes, Reject";
        confirmActionBtn.style.background = "#c84c4c";
    }

    confirmModal.classList.add("show");
}
 
async function confirmOrderAction() {
    if (!selectedGroupId || !selectedAction) {
        return;
    }

    const action = selectedAction;
    const groupId = selectedGroupId;

    confirmActionBtn.disabled = true;
    confirmActionBtn.textContent = "Please wait...";

    try {
        const data = await apiRequest(
            `/admin/group-orders/${groupId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    action
                })
            }
        );

        closeConfirmModal();

        selectedGroupId = null;
        selectedAction = null;

        if (action === "approve") {
            successTitle.textContent = "Order Approved";

            successMessage.textContent =
                data.message || "The group order has been successfully approved.";

        } else {
            successTitle.textContent = "Order Rejected";

            successMessage.textContent =
                data.message || "The group order has been rejected.";
        }

        successModal.classList.add("show");

        await loadOrders();

    } catch (error) {
        alert(error.message || "Unable to update order status.");

    } finally {
        confirmActionBtn.disabled = false;

        if (selectedAction === "reject") {
            confirmActionBtn.textContent = "Yes, Reject";
        } else {
            confirmActionBtn.textContent = "Yes, Approve";
        }
    }
}
  

function closeDetailsModal() {
    if (detailsModal) {
        detailsModal.classList.remove("show");
    }
}

function closeConfirmModal() {
    if (confirmModal) {
        confirmModal.classList.remove("show");
    }
}

function closeSuccessModal() {
    if (successModal) {
        successModal.classList.remove("show");
    }
}
 

function openLogoutModal() {
    if (logoutModal) {
        logoutModal.classList.add("show");
    } else {
        performLogout();
    }
}

function performLogout() {
    sessionStorage.removeItem("waterWatchCurrentUser");
    sessionStorage.removeItem("waterWatchToken");

    window.location.href = "../login.html";
}
 

if (stationOrdersContainer) {
    stationOrdersContainer.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const groupId = button.dataset.id;

        if (action === "view") {
            viewOrderDetails(groupId);
        }

        if (action === "approve" || action === "reject") {
            openActionConfirmation(groupId, action);
        }
    });
}

if (searchInput) {
    searchInput.addEventListener("input", displayOrders);
}

if (stationFilter) {
    stationFilter.addEventListener("change", displayOrders);
}

if (refreshBtn) {
    refreshBtn.addEventListener("click", loadOrders);
}

if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener("click", closeDetailsModal);
}

if (closeDetailsFooterBtn) {
    closeDetailsFooterBtn.addEventListener(
        "click",
        closeDetailsModal
    );
}

if (cancelActionBtn) {
    cancelActionBtn.addEventListener(
        "click",
        closeConfirmModal
    );
}

if (confirmActionBtn) {
    confirmActionBtn.addEventListener(
        "click",
        confirmOrderAction
    );
}

if (successCloseBtn) {
    successCloseBtn.addEventListener(
        "click",
        closeSuccessModal
    );
}

if (detailsModal) {
    detailsModal.addEventListener("click", event => {
        if (event.target === detailsModal) {
            closeDetailsModal();
        }
    });
}

if (confirmModal) {
    confirmModal.addEventListener("click", event => {
        if (event.target === confirmModal) {
            closeConfirmModal();
        }
    });
}

if (successModal) {
    successModal.addEventListener("click", event => {
        if (event.target === successModal) {
            closeSuccessModal();
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", openLogoutModal);
}

if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener("click", () => {
        logoutModal.classList.remove("show");
    });
}

if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", performLogout);
}
 

if (checkAdminSession()) {
    loadOrders();
}