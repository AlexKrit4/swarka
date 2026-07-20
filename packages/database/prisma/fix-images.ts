import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Real photos from Wikimedia Commons (free license, works when Unsplash is blocked). */
const HERO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/1280px-Carport_with_storage.jpg";

const serviceImages = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/960px-Carport_with_storage.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/d/d7/Black_Cantilever_Carport.gif",
  "https://upload.wikimedia.org/wikipedia/commons/c/c2/Pergola.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Via_Camillo_Cavour_26%2C_Palazzo_Castiglione%2C_androne%2C_cancellata_02_iniziali_LC.jpg/1280px-Via_Camillo_Cavour_26%2C_Palazzo_Castiglione%2C_androne%2C_cancellata_02_iniziali_LC.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Swimming_pool_at_Hotel_Terra_Barichara.jpg/1280px-Swimming_pool_at_Hotel_Terra_Barichara.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/GMAW.welding.af.ncs.jpg/1280px-GMAW.welding.af.ncs.jpg",
];

const portfolioImages = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Carport_with_storage.jpg/1280px-Carport_with_storage.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/d/d7/Black_Cantilever_Carport.gif",
  "https://upload.wikimedia.org/wikipedia/commons/c/c2/Pergola.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Via_Santo_Spirito_27%2C_palazzo_Graziosi_Manetti%2C_androne_01_cancellata.jpg/1280px-Via_Santo_Spirito_27%2C_palazzo_Graziosi_Manetti%2C_androne_01_cancellata.jpg",
];

async function main() {
  await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: { heroImageUrl: HERO },
  });

  const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  for (let i = 0; i < services.length; i++) {
    await prisma.service.update({
      where: { id: services[i].id },
      data: { imageUrl: serviceImages[i] ?? HERO },
    });
  }

  const portfolio = await prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
  for (let i = 0; i < portfolio.length; i++) {
    await prisma.portfolioItem.update({
      where: { id: portfolio[i].id },
      data: { imageUrl: portfolioImages[i] ?? HERO },
    });
  }

  console.log("Real image URLs updated from Wikimedia Commons");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
