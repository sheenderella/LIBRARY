document.addEventListener('DOMContentLoaded', function() {
    flatpickr("#dateFilter", {
        mode: "range",
        dateFormat: "Y-m-d",
        allowInput: true,
        static: true,
        enableTime: false,
        clearable: true,
        onChange: function(selectedDates, dateStr, instance) {
            filterAndRenderRecords();
        },
        appendTo: document.body, // Prevents flatpickr from being hidden by overflow
        plugins: [
            new flatpickr.plugins.clearPlugin({
                positions: ["right"]
            }),
            new flatpickr.plugins.todayPlugin({
                label: "Today"
            })
        ]
    });
});
