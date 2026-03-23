export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      name: 'Ahmed K.',
      location: 'Lahore, PK',
      rating: 5,
      text: 'The AI Agent has increased my win rate by 40%. The predictions are scarily accurate!',
      avatar: 'https://i.pravatar.cc/40?img=1'
    },
    {
      id: 2,
      name: 'Priya S.',
      location: 'Mumbai, IN',
      rating: 4,
      text: 'Love the auto-cashout feature. It takes the emotion out of the game and lets me play strategically.',
      avatar: 'https://i.pravatar.cc/40?img=2'
    },
    {
      id: 3,
      name: 'Karim R.',
      location: 'Karachi, PK',
      rating: 5,
      text: 'The referral bonuses with AI optimization have earned me extra income. Highly recommend!',
      avatar: 'https://i.pravatar.cc/40?img=3'
    }
  ];

  return (
    <div className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-orbitron text-center text-primary mb-12">
          What Players Are Saying
        </h2>
        
        {/* Testimonials Carousel - simple version */}
        <div className="space-y-6">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="bg-gray-800/50 p-6 rounded-lg border border-gray-700"
            >
              <div className="flex items-center space-x-4 mb-4">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name} 
                  className="w-10 h-10 rounded-full border border-primary"
                />
                <div>
                  <h3 className="font-medium text-white">{testimonial.name}</h3>
                  <p className="text-sm text-gray-400">{testimonial.location}</p>
                </div>
              </div>
              <div className="flex items-center mb-3">
                {/* Render stars as text */}
                <div className="text-yellow-400">
                  {'★'.repeat(testimonial.rating)}
                  {'☆'.repeat(5 - testimonial.rating)}
                </div>
              </div>
              <p className="text-sm text-gray-300 italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
        
        {/* Note: For a production carousel, consider using a library like Swiper or Embla */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Testimonials are from real users of the AI Agent platform.
        </p>
      </div>
    </div>
  );
}
