export function CategoryBreakdown() {
  const categories = [
    {
      name: 'Non-Indic (Mustang)',
      booksToGo: '20,456',
      completionRate: '141.89%',
      bgGradient: 'from-blue-900/20 to-blue-800/10',
      accentColor: 'text-blue-400',
    },
    {
      name: 'Indic (Mustang)',
      booksToGo: '23,856',
      completionRate: '47.06%',
      bgGradient: 'from-cyan-900/20 to-cyan-800/10',
      accentColor: 'text-cyan-400',
    },
    {
      name: 'Jaguar',
      booksToGo: '9,394',
      completionRate: '67.16%',
      bgGradient: 'from-purple-900/20 to-purple-800/10',
      accentColor: 'text-purple-400',
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Category Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${category.bgGradient} border border-border rounded-lg p-6 space-y-4`}
          >
            <h3 className={`font-semibold ${category.accentColor}`}>
              {category.name}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Books To Go</p>
                <p className="text-xl font-bold text-warning">
                  {category.booksToGo}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Completion Rate
                </p>
                <p className={`text-xl font-bold ${category.accentColor}`}>
                  {category.completionRate}
                </p>
              </div>
              <div className="w-full bg-border rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full bg-gradient-to-r from-primary to-accent`}
                  style={{
                    width: Math.min(
                      parseFloat(category.completionRate) / 100,
                      1
                    ) * 100 + '%',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
