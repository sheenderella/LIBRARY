// Sidebar toggle functionality
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
  });

  // FAQ Search Functionality
document.querySelector('.search button').addEventListener('click', function() {
    const input = document.getElementById('input-box').value.toLowerCase();
    const faqs = document.querySelectorAll('.accordion-item'); // Select all FAQ accordion items
  
    faqs.forEach(function(faq) {
      const faqHeader = faq.querySelector('.accordion-header').textContent.toLowerCase(); // Search in the header
      const faqBody = faq.querySelector('.accordion-body').textContent.toLowerCase(); // Search in the body
  
      // Check if the search input is found in either header or body
      if (faqHeader.includes(input) || faqBody.includes(input)) {
        faq.style.display = 'block'; // Show FAQ item if search text matches
      } else {
        faq.style.display = 'none'; // Hide FAQ item if search text doesn't match
      }
    });
  });
  