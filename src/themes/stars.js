export const createStars = () => {
        const container = document.querySelector('body');
        if (!container) return;
        
        // Clear any existing stars
        const existingStars = document.querySelectorAll('.star');
        existingStars.forEach(star => star.remove());
        
        // Create the starry background div if it doesn't exist
        let starryBackground = document.querySelector('.starry-background');
        if (!starryBackground) {
            starryBackground = document.createElement('div');
            starryBackground.className = 'starry-background';
            container.appendChild(starryBackground);
        }
        
        const starCount = 200;
        
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            const size = Math.random() * 2 + 1;
            
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.animationDelay = `${Math.random() * 5}s`;
            
            starryBackground.appendChild(star);
        }
};
    
export const createShootingStars = () => {
        const container = document.querySelector('.starry-background');
        if (!container) return;
        
        // Clear any existing shooting stars
        const existingShootingStars = document.querySelectorAll('.shooting-star');
        existingShootingStars.forEach(star => star.remove());
        
        // Create new shooting stars
        for (let i = 0; i < 3; i++) {
            const shootingStar = document.createElement('div');
            shootingStar.className = 'shooting-star';
            shootingStar.style.top = `${Math.random() * 70}%`;
            shootingStar.style.left = `${Math.random() * 30}%`;
            shootingStar.style.animationDelay = `${i * 4}s`;
            
            container.appendChild(shootingStar);
        }
};