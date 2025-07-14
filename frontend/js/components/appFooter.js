// AppFooter.js - Reusable footer for cricbuzz11

const appFooterHtml = `
  <footer class="fixed bottom-0 left-0 w-full z-50" style="background: transparent;">
    <div class="max-w-sm mx-auto bg-white border-t border-gray-200 rounded-t-xl overflow-hidden">
      <nav class="flex justify-around items-center py-2">
        <!-- Home (active) -->
        <a href="#" class="flex flex-col items-center text-primary font-semibold">
          <span class="flex items-center justify-center w-10 h-8 rounded-full bg-primary/10 mb-1">
            <!-- Home SVG -->
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 10.75L12 4l9 6.75" stroke="#137f66" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10.75V19a1 1 0 0 1-1 1h-3.5a1 1 0 0 1-1-1v-3.5a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.25" stroke="#137f66" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="text-xs">Home</span>
        </a>
        <!-- How to play -->
        <a href="#" class="flex flex-col items-center text-gray-700 font-semibold">
          <span class="flex items-center justify-center w-10 h-8 rounded-full mb-1">
            <!-- Gamepad SVG -->
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M7 17v-1m10 1v-1m-7-4h4m-2 2v-4m-7.5 2.5a7.5 7.5 0 1 1 15 0c0 1.2-.3 2.3-.8 3.3-.3.6-.5.9-.7 1.1-.2.2-.5.3-1.1.3H6.1c-.6 0-.9-.1-1.1-.3-.2-.2-.4-.5-.7-1.1-.5-1-.8-2.1-.8-3.3Z" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="text-xs">How to play</span>
        </a>
      </nav>
    </div>
  </footer>
`;

function injectAppFooter() {
  const footerContainer = document.getElementById('app-footer');
  if (footerContainer) {
    footerContainer.innerHTML = appFooterHtml;
  }
}

document.addEventListener('DOMContentLoaded', injectAppFooter); 