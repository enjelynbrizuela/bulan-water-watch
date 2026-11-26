const currentUser = sessionStorage.getItem("waterWatchCurrentUser");
const adminToken = sessionStorage.getItem("waterWatchToken");

let adminUser = null;

try {
    adminUser = currentUser ? JSON.parse(currentUser) : null;
} catch (error) {
    console.error("Invalid admin session:", error);
}

if (
    !adminUser ||
    !adminToken ||
    String(adminUser.role).toLowerCase() !== "admin"
) {
    sessionStorage.removeItem("waterWatchCurrentUser");
    sessionStorage.removeItem("waterWatchToken");

    window.location.href = "../login.html";
}

const totalGroupsElement = document.getElementById("totalGroups");
const pendingGroupsElement = document.getElementById("pendingGroups");
const approvedGroupsElement = document.getElementById("approvedGroups");
const rejectedGroupsElement = document.getElementById("rejectedGroups");
const totalCustomersElement = document.getElementById("totalCustomers");
const totalStationsElement = document.getElementById("totalStations");

const ordersChart = document.getElementById("ordersChart");
const stationSummary = document.getElementById("stationSummary");
const recentOrdersBody = document.getElementById("recentOrdersBody");
const currentDateElement = document.getElementById("currentDate");

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");


let allGroups = [];
let dashboardStatistics = {};

const adminWaterStations = [
    {
        id: 1,
        name: "Forest Water Refiling Station",
        address: "N. Vytiaco Street, Bulan, Sorsogon",
        price: 25
    },
    {
        id: 2,
        name: "Fairways Purified Water Station",
        address: "Imaculada Concepcion Street, Bulan, Sorsogon",
        price: 30
    },
    {
        id: 3,
        name: "Summer Water Refilling Station",
        address: "59 Sta. Remedios, Bulan, Sorsogon",
        price: 25
    },
    {
        id: 4,
        name: "Yhel Pure Purified Water",
        address: "118 T. De Castro Street, Bulan, Sorsogon",
        price: 30
    },
    {
        id: 5,
        name: "Uncle J Purified Water Station",
        address: "Padre Diaz Street, Bulan, Sorsogon",
        price: 25
    },
    {
        id: 6,
        name: "Viva Mari Water Station",
        address: "T. De Castro Street, Zone VIII Poblacion, Bulan, Sorsogon",
        price: 30
    }
];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character];
    });
}

const API_BASE_URL = "https://bulan-water-watch.up.railway.app";

async function apiRequest(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + adminToken,
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("waterWatchCurrentUser");
        sessionStorage.removeItem("waterWatchToken");

        alert("Your admin session has expired. Please log in again.");

        window.location.href = "../login.html";

        throw new Error("Admin authentication failed.");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load dashboard data.");
    }

    return data;
}

function getAdminStatus(group) {
    const status = String(
        group.adminStatus || group.status || "Pending"
    ).toLowerCase();

    if (status === "confirmed" || status === "approved") {
        return "Approved";
    }

    if (status === "rejected") {
        return "Rejected";
    }

    if (status === "cancelled" || status === "canceled") {
        return "Cancelled";
    }

    if (status === "completed") {
        return "Completed";
    }

    return "Pending";
}

function getStatusBadge(status) {
    const classes = {
        Pending: "pending",
        Approved: "approved",
        Rejected: "rejected",
        Cancelled: "cancelled",
        Completed: "completed"
    };

    return `
        <span class="status ${classes[status] || "pending"}">
            ${escapeHTML(status)}
        </span>
    `;
}

function formatDate(dateValue) {
    if (!dateValue) return "N/A";

    const value = String(dateValue);

    const date = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
        ? new Date(value.replace(" ", "T"))
        : new Date(value);

    if (isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}


function displayStatistics(statistics) {
    if (totalGroupsElement) {
        totalGroupsElement.textContent =
            statistics.totalGroups ?? 0;
    }

    if (pendingGroupsElement) {
        pendingGroupsElement.textContent =
            statistics.pendingGroups ?? 0;
    }

    if (approvedGroupsElement) {
        approvedGroupsElement.textContent =
            statistics.approvedGroups ?? 0;
    }

    if (rejectedGroupsElement) {
        rejectedGroupsElement.textContent =
            statistics.rejectedGroups ?? 0;
    }

    if (totalCustomersElement) {
        totalCustomersElement.textContent =
            statistics.totalCustomers ?? 0;
    }

    if (totalStationsElement) {
        totalStationsElement.textContent =
            statistics.totalStations ?? 0;
    }
}


function displayOrdersChart(groups) {
    if (!ordersChart) return;

    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);

        date.setHours(0, 0, 0, 0);
        date.setDate(today.getDate() - i);

        days.push({
            date: date,
            label: date.toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric"
            }),
            count: 0
        });
    }

    groups.forEach(group => {
        if (!group.dateCreated) return;

        const createdDate = new Date(
            String(group.dateCreated).replace(" ", "T")
        );

        if (isNaN(createdDate.getTime())) return;

        createdDate.setHours(0, 0, 0, 0);

        const matchingDay = days.find(day =>
            day.date.getTime() === createdDate.getTime()
        );

        if (matchingDay) {
            matchingDay.count++;
        }
    });

    const maxCount = Math.max(
        ...days.map(day => day.count),
        1
    );

    ordersChart.innerHTML = days.map(day => {
        const height = day.count === 0
            ? 3
            : Math.max((day.count / maxCount) * 100, 5);

        return `
            <div class="chart-day">

                <div class="chart-bar-wrap"
                     title="${day.count} order(s)">

                    <div class="chart-bar"
                         style="height: ${height}%">
                    </div>

                </div>

                <span>${escapeHTML(day.label)}</span>

            </div>
        `;
    }).join("");
}


function displayStationSummary(groups) {
    if (!stationSummary) return;

    const stationCounts = {};

    adminWaterStations.forEach(station => {
        stationCounts[station.name.toLowerCase().trim()] = 0;
    });

    groups.forEach(group => {
        const groupStation = String(group.station || "")
            .toLowerCase()
            .trim();

        if (
            Object.prototype.hasOwnProperty.call(
                stationCounts,
                groupStation
            )
        ) {
            stationCounts[groupStation]++;
        }
    });

    const highestCount = Math.max(
        ...Object.values(stationCounts),
        1
    );

    stationSummary.innerHTML = adminWaterStations.map(station => {
        const key = station.name.toLowerCase().trim();
        const count = stationCounts[key] || 0;

        const percentage = count > 0
            ? (count / highestCount) * 100
            : 0;

        return `
            <div class="station-item">

                <div class="station-info">

                    <strong>${escapeHTML(station.name)}</strong>

                    <span>
                        ${count} ${count === 1 ? "order" : "orders"}
                    </span>

                </div>

                <div class="station-info">

                    <span class="station-address">
                        ${escapeHTML(station.address)}
                    </span>

                    <span class="station-price">
                        ₱${station.price}/gallon
                    </span>

                </div>

                <div class="progress-track">

                    <div class="progress-fill"
                         style="width: ${percentage}%">
                    </div>

                </div>

            </div>
        `;
    }).join("");
}


function displayRecentOrders(groups) {
    if (!recentOrdersBody) return;

    if (!groups || groups.length === 0) {
        recentOrdersBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table">
                    No group orders found.
                </td>
            </tr>
        `;

        return;
    }

    const recentGroups = [...groups]
        .sort((a, b) => {
            return new Date(b.dateCreated || 0) -
                   new Date(a.dateCreated || 0);
        })
        .slice(0, 7);

    recentOrdersBody.innerHTML = recentGroups.map(group => {
        const status = getAdminStatus(group);

        return `
            <tr>

                <td class="order-id">
                    ${escapeHTML(group.reference_id || group.id || "N/A")}
                </td>

                <td>
                    ${escapeHTML(group.station || "Unknown Station")}
                </td>

                <td>
                    ${escapeHTML(group.createdBy || "Unknown Customer")}
                </td>

                <td>
                    ${Number(
                        group.participantCount ||
                        group.participants ||
                        1
                    )}
                </td>

                <td>
                    ${formatDate(group.dateCreated)}
                </td>

                <td>
                    ${getStatusBadge(status)}
                </td>

            </tr>
        `;
    }).join("");
}


function displayCurrentDate() {
    if (!currentDateElement) return;

    currentDateElement.textContent =
        new Date().toLocaleDateString("en-PH", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
}

async function loadDashboard() {
    try {
        if (recentOrdersBody) {
            recentOrdersBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-table">
                        Loading customer orders...
                    </td>
                </tr>
            `;
        }

        const [ordersData, statisticsData] = await Promise.all([
            apiRequest("/api/admin/group-orders"),
            apiRequest("/api/admin/statistics")
        ]);

        allGroups = ordersData.groups || [];
        dashboardStatistics = statisticsData.statistics || {};

        displayStatistics(dashboardStatistics);
        displayOrdersChart(allGroups);
        displayStationSummary(allGroups);
        displayRecentOrders(allGroups);
        displayCurrentDate();

        console.log("Admin dashboard loaded successfully.");
        console.log("Customer group orders:", allGroups);

    } catch (error) {
        console.error("Dashboard loading error:", error);

        if (recentOrdersBody) {
            recentOrdersBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-table">
                        Unable to load orders. ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;
        }
    }
}


if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", function () {
        logoutModal.classList.add("show");
    });
}

if (cancelLogoutBtn && logoutModal) {
    cancelLogoutBtn.addEventListener("click", function () {
        logoutModal.classList.remove("show");
    });
}

if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", function () {
        sessionStorage.removeItem("waterWatchCurrentUser");
        sessionStorage.removeItem("waterWatchToken");

        window.location.href = "../login.html";
    });
}

if (logoutModal) {
    logoutModal.addEventListener("click", function (event) {
        if (event.target === logoutModal) {
            logoutModal.classList.remove("show");
        }
    });
}


if (
    adminUser &&
    adminToken &&
    String(adminUser.role).toLowerCase() === "admin"
) {
    loadDashboard();
}

setInterval(() => {
    if (
        adminUser &&
        adminToken &&
        String(adminUser.role).toLowerCase() === "admin"
    ) {
        loadDashboard();
    }
}, 30000);
