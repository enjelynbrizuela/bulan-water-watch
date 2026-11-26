
const API_BASE_URL = "https://bulan-water-watch.up.railway.app";

const registerForm = document.getElementById("registerForm");

const roleButtons = document.querySelectorAll(".role-btn");
const successModal = document.getElementById("successModal");
const errorModal = document.getElementById("errorModal");
const errorMessage = document.getElementById("errorMessage");
const closeError = document.getElementById("closeError");

const submitButton = registerForm.querySelector('[type="submit"]');

let selectedRole = "Customer";

// Role buttons
roleButtons.forEach(button => {
    button.addEventListener("click", () => {
        roleButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        selectedRole = "Customer";
    });
});

// Registration
registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!fullname || !email || !phone || !password || !confirmPassword) {
        showError("Please complete all required fields.");
        return;
    }

    if (!/^09[0-9]{9}$/.test(phone)) {
        showError("Please enter a valid 11-digit Philippine mobile number starting with 09.");
        return;
    }

    if (password.length < 8) {
        showError("Password must be at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showError("Passwords do not match.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fullname,
                    email,
                    phone,
                    password,
                    confirmPassword
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Registration failed."
            );
        }

        registerForm.reset();

        roleButtons.forEach(btn => btn.classList.remove("active"));

        if (roleButtons.length > 0) {
            roleButtons[0].classList.add("active");
        }

        selectedRole = "Customer";

        successModal.classList.add("show");

    } catch (error) {
        console.error("Registration error:", error);

        showError(
            error.message || "Unable to connect to the server."
        );

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Create account";
    }
});

// Show error modal
function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.add("show");
}

// Close error modal
closeError.addEventListener("click", () => {
    errorModal.classList.remove("show");
});

// Close modal when clicking outside
errorModal.addEventListener("click", e => {
    if (e.target === errorModal) {
        errorModal.classList.remove("show");
    }
});
