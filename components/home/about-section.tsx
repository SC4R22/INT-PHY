export function AboutSection() {
  return (
    <section className="section-padding bg-light-bg dark:bg-dark-bg">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Who Are We */}
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-payback font-bold text-light-header dark:text-dark-header">
              Who Are We?
            </h2>
            <p className="text-lg leading-relaxed text-light-body/80 dark:text-dark-body/80">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras malesuada, 
              lectus eu vehicula gravida, enim quam porttitor augue, sed tincidunt 
              metus dolor sit amet nunc. Ut condimentum dolor ac elit laoreet, et mollis 
              tortor rhoncus. Maecenas eget dapibus tortor. Phasellus viverra, diam a 
              condimentum facilisis, felis diam volutpat purus, non sodales lectus e. 
              Quisque eget bibendum ligula.
            </p>
          </div>

          {/* About Our System */}
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-payback font-bold text-light-header dark:text-dark-header">
              About Our System
            </h2>
            <div className="space-y-4 text-lg leading-relaxed text-light-body/80 dark:text-dark-body/80">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dicta doloribus 
                error, facere fugiat possimus praesentium! Atque dicta eum laoreet iandantium 
                magni modi mollitia nam natus, officia sequi similique soluta voluptate?
              </p>
              <p>
                A atque blanditiis cum, dicta dolore eius fugiat fugit hic ipsa 
                laudantium nam nisl numquam officia placeat praesentium quae quam 
                quibusdam quis quos sapiente sequi tempore temporibus velit voluptates 
                voluptatibus!
              </p>
            </div>

            {/* Arabic Quote */}
            <div className="text-center py-8">
              <p className="text-2xl lg:text-3xl font-bold text-primary" dir="rtl">
                يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ
              </p>
              <p className="text-lg text-light-body/60 dark:text-dark-body/60 mt-4">
                [الحشر: ١٨]
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
