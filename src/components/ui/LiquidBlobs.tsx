'use client'

export function LiquidBlobs() {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
      {/* Large cyan blob - top left */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'blob1 20s ease-in-out infinite',
        }}
      />
      
      {/* Purple blob - top right */}
      <div
        className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'blob2 25s ease-in-out infinite',
        }}
      />
      
      {/* Teal blob - center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.2) 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'blob3 30s ease-in-out infinite',
        }}
      />
      
      {/* Gold blob - bottom right */}
      <div
        className="absolute -bottom-32 -right-32 w-[450px] h-[450px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'blob4 22s ease-in-out infinite',
        }}
      />
      
      {/* Small accent blobs */}
      <div
        className="absolute top-1/4 right-1/3 w-[200px] h-[200px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'blob5 15s ease-in-out infinite',
        }}
      />
      
      <div
        className="absolute bottom-1/3 left-1/4 w-[250px] h-[250px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob6 18s ease-in-out infinite',
        }}
      />
      
      <style jsx>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(100px, 50px) scale(1.1); }
          50% { transform: translate(50px, 100px) scale(0.9); }
          75% { transform: translate(-50px, 50px) scale(1.05); }
        }
        
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-80px, 80px) scale(1.15); }
          66% { transform: translate(-40px, -40px) scale(0.85); }
        }
        
        @keyframes blob3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          25% { transform: translate(-45%, -55%) scale(1.1); }
          50% { transform: translate(-55%, -45%) scale(0.95); }
          75% { transform: translate(-50%, -50%) scale(1.05); }
        }
        
        @keyframes blob4 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(-60px, -60px) scale(1.2) rotate(180deg); }
        }
        
        @keyframes blob5 {
          0%, 100% { transform: translate(0, 0); opacity: 0.6; }
          50% { transform: translate(30px, -40px); opacity: 1; }
        }
        
        @keyframes blob6 {
          0%, 100% { transform: translate(0, 0); opacity: 0.5; }
          50% { transform: translate(-20px, 30px); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
