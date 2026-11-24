
const token = sessionStorage.getItem("waterWatchToken");
const currentUser = sessionStorage.getItem("waterWatchCurrentUser");

if (!token || !currentUser) {
    window.location.href = "login.html";
}

let user = currentUser ? JSON.parse(currentUser) : {};

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profilePhone = document.getElementById("displayPhone");
const avatar = document.getElementById("avatar");

const editModal = document.getElementById("editModal");
const passwordModal = document.getElementById("passwordModal");
const logoutModal = document.getElementById("logoutModal");
const successModal = document.getElementById("successModal");
const errorModal = document.getElementById("errorModal");

 

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

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

 
function displayProfile() {
    const name = user.fullname || user.name || "Customer";

    profileName.textContent = name;
    profileEmail.textContent = user.email || "No email available";

    document.getElementById("displayName").textContent = name;
    document.getElementById("displayEmail").textContent =
        user.email || "No email available";

    profilePhone.textContent = user.phone || "Not provided";

    avatar.textContent = name.charAt(0).toUpperCase();
}

 

async function loadProfile() {
    try {
        const data = await apiRequest("/api/profile");

        user = data.user;

        sessionStorage.setItem(
            "waterWatchCurrentUser",
            JSON.stringify(user)
        );

        displayProfile();

    } catch (error) {
        console.error("Load profile error:", error);
        showError(error.message || "Unable to load profile.");
    }
}

displayProfile();
loadProfile();

 

document.getElementById("editBtn").addEventListener("click", function() {
    document.getElementById("editName").value =
        user.fullname || user.name || "";

    document.getElementById("editPhone").value =
        user.phone || "";

    editModal.classList.add("show");
});

 

document.getElementById("editForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const newName = document.getElementById("editName").value.trim();
    const newPhone = document.getElementById("editPhone").value.trim();

    if (!newName || !newPhone) {
        showError("Please enter your full name and phone number.");
        return;
    }

    if (!/^09[0-9]{9}$/.test(newPhone)) {
        showError("Please enter a valid 11-digit phone number starting with 09.");
        return;
    }

    const saveButton = this.querySelector('[type="submit"]');

    try {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        const data = await apiRequest("/api/profile", {
            method: "PUT",
            body: JSON.stringify({
                fullname: newName,
                phone: newPhone
            })
        });

        user = data.user;

        sessionStorage.setItem(
            "waterWatchCurrentUser",
            JSON.stringify(user)
        );

        displayProfile();

        editModal.classList.remove("show");

        showSuccess("Your profile has been updated successfully.");

    } catch (error) {
        console.error("Update profile error:", error);
        showError(error.message || "Unable to update profile.");

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
    }
});

 
document.getElementById("changePasswordBtn")
    .addEventListener("click", function() {
        passwordModal.classList.add("show");
    });

document.getElementById("passwordForm")
    .addEventListener("submit", function(e) {
        e.preventDefault();

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (newPassword.length < 8) {
            showError("New password must contain at least 8 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            showError("New passwords do not match.");
            return;
        }

        showError(
            "Password updating is not connected yet. " +
            "We need to connect this feature to the account system first."
        );
    });

 
document.getElementById("logoutBtn")
    .addEventListener("click", function() {
        logoutModal.classList.add("show");
    });

document.getElementById("cancelLogout")
    .addEventListener("click", function() {
        logoutModal.classList.remove("show");
    });

document.getElementById("confirmLogout")
    .addEventListener("click", function() {
        sessionStorage.removeItem("waterWatchCurrentUser");
        sessionStorage.removeItem("waterWatchToken");

        window.location.href = "login.html";
    });

 

document.getElementById("closeEdit")
    .addEventListener("click", function() {
        editModal.classList.remove("show");
    });

document.getElementById("closePassword")
    .addEventListener("click", function() {
        passwordModal.classList.remove("show");
    });

 

function showSuccess(message) {
    document.getElementById("successMessage").textContent = message;
    successModal.classList.add("show");
}

function showError(message) {
    document.getElementById("errorMessage").textContent = message;
    errorModal.classList.add("show");
}

document.getElementById("successContinue")
    .addEventListener("click", function() {
        successModal.classList.remove("show");
    });

document.getElementById("closeError")
    .addEventListener("click", function() {
        errorModal.classList.remove("show");
    });

[
    editModal,
    passwordModal,
    logoutModal,
    successModal,
    errorModal
].forEach(modal => {
    modal.addEventListener("click", function(e) {
        if (e.target === modal) {
            modal.classList.remove("show");
        }
    });
});
