// Welcome Message on Console
console.log(
    "%c🧧 AI & Games Dashboard initialized successfully! 🚀", 
    "color: #ff007f; font-size: 14px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);"
);

// Update current year dynamically in footer
document.addEventListener("DOMContentLoaded", () => {
    const yearSpan = document.getElementById("currentYear");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Interactive Hover Tilt Effect for Cards
    const cards = document.querySelectorAll('.menu-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x coordinate inside the card
            const y = e.clientY - rect.top;  // y coordinate inside the card

            const xc = rect.width / 2;
            const yc = rect.height / 2;

            // Tilt amount (max 8 degrees)
            const angleX = (yc - y) / yc * 8;
            const angleY = (x - xc) / xc * 8;

            card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        });
    });
});
