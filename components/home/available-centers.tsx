export function AvailableCenters() {
  const centers = [
    { name: 'Faysl', color: 'bg-primary' },
    { name: 'October', color: 'bg-primary' },
    { name: 'Dokki', color: 'bg-primary' },
  ]

  return (
    <section className="section-padding bg-light-bg-secondary dark:bg-dark-bg/50">
      <div className="container-custom">
        <h2 className="text-4xl lg:text-5xl font-payback font-bold text-center mb-12 text-light-header dark:text-dark-header">
          Available Centers
        </h2>
        
        <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
          {centers.map((center) => (
            <div
              key={center.name}
              className={`${center.color} text-white px-12 py-6 rounded-full text-xl lg:text-2xl font-bold font-payback shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer`}
            >
              {center.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
