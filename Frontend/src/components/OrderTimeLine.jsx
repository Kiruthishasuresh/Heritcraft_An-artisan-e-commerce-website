const OrderTimeline = ({ currentStatus = 'placed' }) => {
  const steps = ['placed', 'packed', 'shipped', 'delivered'];
  const index = steps.indexOf(currentStatus);

  return (
    <div className="py-5">
      <div className="grid grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <div key={step} className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${i <= index ? 'bg-[var(--gold)] text-black' : 'bg-[#222] text-gray-500'}`}>
              {i + 1}
            </div>
            <p className={`mt-2 capitalize ${i <= index ? 'text-[var(--gold)]' : 'text-gray-500'}`}>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTimeline;
