document.addEventListener('DOMContentLoaded', function () {
    // Initialize Flatpickr for date range selection with manual input enabled
    flatpickr("#dateRangeFilter", {
        mode: "range",
        dateFormat: "Y-m-d",
        allowInput: true, // Enable manual input
        onChange: filterAndRenderRecords
    });
});
