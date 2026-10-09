import MessagesClient from '../../components/MessagesClient';

export const metadata = {
  title: 'Мессеж — ZarBook.mn',
  description: 'Зар нийтлэгчтэй шууд харилцах мессежийн хэсэг (зөвхөн оролцогч хоёр харна).',
};

export default function MessagesPage() {
  return <MessagesClient />;
}
