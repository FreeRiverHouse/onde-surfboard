import { NextResponse } from 'next/server'

export const runtime = 'edge'

interface Book {
  id: string
  title: string
  author: string
  illustrator: string
  status: string
  progress: number
  chapters: number
  chaptersReady: number
  imagesReady: number
  imagesTotal: number
}

interface Author {
  id: string
  name: string
  role: 'writer' | 'illustrator'
  style: string
  activeBooks: number
}

// In edge runtime (Cloudflare), we can't access the filesystem
// Return static demo data
// TODO: Connect to a database or external API for real CORDE data
export async function GET() {
  const books: Book[] = [
    {
      id: 'marco-aurelio-bambini',
      title: 'Marco Aurelio per Bambini',
      author: 'Gianni Parola',
      illustrator: 'Pina Pennello',
      status: 'testo_completo',
      progress: 40,
      chapters: 10,
      chaptersReady: 10,
      imagesReady: 3,
      imagesTotal: 10
    },
    {
      id: 'piccole-onde-serie',
      title: 'Piccole Onde',
      author: 'Luna Racconta',
      illustrator: 'Milo Matita',
      status: 'illustrazioni',
      progress: 70,
      chapters: 8,
      chaptersReady: 8,
      imagesReady: 5,
      imagesTotal: 8
    },
    {
      id: 'seneca-stories',
      title: 'Seneca per Piccoli Saggi',
      author: 'Gianni Parola',
      illustrator: 'Sofia Stelle',
      status: 'concept',
      progress: 10,
      chapters: 12,
      chaptersReady: 0,
      imagesReady: 0,
      imagesTotal: 12
    }
  ]

  const authors: Author[] = [
    { id: 'gianni-parola', name: 'Gianni Parola', role: 'writer', style: 'Narrativa filosofica per bambini', activeBooks: 2 },
    { id: 'luna-racconta', name: 'Luna Racconta', role: 'writer', style: 'Favole rilassanti', activeBooks: 1 },
    { id: 'pina-pennello', name: 'Pina Pennello', role: 'illustrator', style: 'Acquarello europeo', activeBooks: 1 },
    { id: 'milo-matita', name: 'Milo Matita', role: 'illustrator', style: 'Digitale colorato', activeBooks: 1 },
    { id: 'sofia-stelle', name: 'Sofia Stelle', role: 'illustrator', style: 'Dreamy soft pastels', activeBooks: 1 }
  ]

  return NextResponse.json({ 
    books, 
    authors,
    note: 'Running in edge mode - showing demo data'
  })
}
