export function translateErrorMessage(msg: string): string {
    if (!msg) return "Ha ocurrido un error desconocido.";

    const lower = msg.toLowerCase();

    // Email validation
    if (lower.includes("valid email") || lower.includes("email address")) {
        return "Introduce un correo electrónico válido.";
    }

    // Credentials
    if (lower.includes("incorrect email or password") || lower.includes("invalid credentials")) {
        return "El correo electrónico o la contraseña son incorrectos.";
    }

    // Required fields
    if (lower.includes("field required") || lower.includes("missing")) {
        return "Por favor, completa todos los campos obligatorios.";
    }

    // Password validation (generic)
    if (lower.includes("password") && (lower.includes("short") || lower.includes("match"))) {
        return "La contraseña no cumple con los requisitos de seguridad.";
    }

    // Username validation
    if (lower.includes("username") && lower.includes("taken")) {
        return "Este nombre de usuario ya está en uso.";
    }

    // Generic fallback for "value is not a valid..."
    if (lower.includes("value is not a valid")) {
        return "Uno de los campos tiene un formato incorrecto.";
    }

    // Token errors
    if (lower.includes("token") || lower.includes("signature")) {
        return "Tu sesión ha expirado. Inicia sesión de nuevo.";
    }

    // Network errors
    if (lower.includes("failed to fetch") || lower.includes("network error") || lower.includes("connection refused")) {
        return "No se ha podido conectar con el servidor. Comprueba tu conexión.";
    }

    // Return original if no match found (or maybe a generic one?)
    // For now, let's return the original but maybe cleaned up a bit
    return msg;
}
