import tkinter as tk
from datetime import datetime

def calculate_days():
    start_date_str = start_date_entry.get()
    end_date_str = end_date_entry.get()

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")

        delta = end_date - start_date
        result_label.config(text=f"Days between dates: {delta.days}")
    except ValueError:
        result_label.config(text="Invalid date format. Use YYYY-MM-DD")

# Create the main window
root = tk.Tk()
root.title("Date Difference Calculator")

# Create and place the widgets
start_date_label = tk.Label(root, text="Start Date (YYYY-MM-DD):")
start_date_label.grid(row=0, column=0, padx=10, pady=5, sticky="w")

start_date_entry = tk.Entry(root, width=20, font=('Arial', 12))
start_date_entry.grid(row=0, column=1, padx=10, pady=5)

end_date_label = tk.Label(root, text="End Date (YYYY-MM-DD):")
end_date_label.grid(row=1, column=0, padx=10, pady=5, sticky="w")

end_date_entry = tk.Entry(root, width=20, font=('Arial', 12))
end_date_entry.grid(row=1, column=1, padx=10, pady=5)

calculate_button = tk.Button(root, text="Calculate", command=calculate_days, font=('Arial', 12))
calculate_button.grid(row=2, column=0, columnspan=2, padx=10, pady=10)

result_label = tk.Label(root, text="", font=('Arial', 14, 'bold'))
result_label.grid(row=3, column=0, columnspan=2, padx=10, pady=5)

# Start the main event loop
root.mainloop()