import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-gray">
      <h1 className="text-3xl font-bold mb-6">Политика конфиденциальности</h1>
      <p className="text-gray-600 mb-4">Дата публикации: {new Date().toLocaleDateString("ru-RU")}</p>

      <section className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Настоящая Политика конфиденциальности определяет порядок обработки и защиты
          персональных данных пользователей сайта (далее — «Сайт»), оставляющих заявки через
          форму обратной связи.
        </p>

        <h2 className="text-xl font-semibold mt-6">1. Какие данные мы собираем</h2>
        <p>
          При заполнении формы заявки мы можем запрашивать: имя, номер телефона, тип услуги
          и комментарий к заказу.
        </p>

        <h2 className="text-xl font-semibold mt-6">2. Цели обработки</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Обработка заявки и обратная связь с клиентом</li>
          <li>Расчёт стоимости работ</li>
          <li>Улучшение качества обслуживания</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">3. Передача данных третьим лицам</h2>
        <p>
          Персональные данные не передаются третьим лицам, за исключением случаев,
          предусмотренных законодательством Российской Федерации.
        </p>

        <h2 className="text-xl font-semibold mt-6">4. Хранение данных</h2>
        <p>
          Данные хранятся на защищённом сервере в течение срока, необходимого для
          обработки заявки и ведения деловой переписки.
        </p>

        <h2 className="text-xl font-semibold mt-6">5. Права пользователя</h2>
        <p>
          Вы вправе запросить удаление или уточнение своих персональных данных,
          обратившись по контактному телефону, указанному на Сайте.
        </p>

        <h2 className="text-xl font-semibold mt-6">6. Согласие</h2>
        <p>
          Отправляя форму на Сайте, вы даёте согласие на обработку персональных данных
          в соответствии с настоящей Политикой и Федеральным законом № 152-ФЗ.
        </p>
      </section>

      <Link href="/" className="inline-block mt-8 text-sm font-semibold underline">
        ← На главную
      </Link>
    </main>
  );
}
