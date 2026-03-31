import { createCanvas, loadImage } from "canvas";
import path from "path";
import { fileURLToPath } from "url";

// import banner from "../assets/banner.png";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateRankCard({
  username,
  level,
  xp,
  maxXp,
  totalXp,
  avatarUrl,
  badgeName,
}) {
  const width = 900;
  const height = 350;

  const textColor = "rgb(255, 255, 255)";
  const bgColorPrimary = "rgba(0, 140, 255, 0.88)";
  const bgColorPrimaryAlpha05 = "rgba(0, 140, 255, 0.5)";
  const bgColorSecondary = "rgba(255, 255, 255, 0.93)";

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // background
  const bg = await loadImage(path.join(__dirname, "./banner.png"));

  const scale = Math.max(width / bg.width, height / bg.height);

  const newWidth = bg.width * scale;
  const newHeight = bg.height * scale;

  const x = (width - newWidth) / 2;
  const y = (height - newHeight) / 2;

  ctx.save();

  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 30);
  ctx.clip();

  ctx.scale(-1, 1);
  ctx.drawImage(bg, -x - newWidth, y - 50, newWidth, newHeight);

  ctx.restore();

  // overlay blur/dark
  ctx.fillStyle = "rgba(20,20,30,0.65)";
  ctx.fillRect(0, 0, width, height);

  // avatar
  avatarUrl = avatarUrl.replace(".webp", ".png");
  const avatar = await loadImage(avatarUrl);
  const avatarSize = 120;

  const avatarX = 120;
  const avatarY = height / 3;

  // border
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // avatar clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    avatar,
    avatarX - avatarSize / 2,
    avatarY - avatarSize / 2,
    avatarSize,
    avatarSize
  );

  ctx.restore();

  // username
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Sans";
  ctx.fillText(username, 220, 100);

  // ======== level badge ========
  const lvX = 220;
  const lvY = 130;
  const lvH = 40;
  const lvW = 150;
  const lvRad = 20;

  ctx.beginPath();

  ctx.font = "bold 24px Sans";
  const lvTextWidth = ctx.measureText(`LEVEL ${level}`).width + 50;

  ctx.fillStyle = bgColorPrimary;
  ctx.roundRect(lvX, lvY, lvTextWidth, lvH, lvRad);
  ctx.fill();

  // Text
  ctx.beginPath();
  ctx.fillStyle = textColor;
  ctx.fillText(`LEVEL ${level}`, lvX + 25, lvY + 28);

  // ======== badge ========
  if (badgeName) {
    const badgeX = 400;
    const badgeY = 130;
    const badgeH = 40;
    const badgeW = 150;
    const badgeRad = 20;

    ctx.font = "bold 24px Sans";
    const badgeTextWidth = ctx.measureText(badgeName).width + 50;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeTextWidth, badgeH, badgeRad);
    ctx.fillStyle = bgColorPrimary;
    ctx.fill();

    ctx.beginPath(); // reset path
    ctx.fillStyle = textColor;
    ctx.fillText(badgeName, badgeX + 25, badgeY + 28);
  }

  // ====== progress bar ========
  const barWidth = width - 150;
  const barHeight = 40;
  const barX = (width - barWidth) / 2;
  const barY = 250;

  const percent = xp / maxXp;
  const progressWidth = Math.max(40, barWidth * percent);

  // background
  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  gradient.addColorStop(0, bgColorPrimary);
  gradient.addColorStop(1, bgColorPrimary);

  ctx.beginPath();
  ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 20);
  ctx.fillStyle = bgColorSecondary;
  ctx.fill();

  // progress bar
  ctx.beginPath();
  ctx.roundRect(barX, barY, progressWidth, barHeight, 20);
  ctx.fillStyle = gradient;
  ctx.fill();

  // xp text
  ctx.fillStyle = textColor;
  ctx.textAlign = "end";
  ctx.font = "bold 25px Sans";
  ctx.fillText(`Total: ${totalXp} exp`, barX + barWidth, barY - 15);

  const percentText = `${Math.ceil(percent * 100) < 5 ? 5 : Math.ceil(percent * 100)}%`;
  const xpText = `${xp} / ${maxXp} exp`;
  const textX = barX + barWidth / 2;
  const textY = barY + 28;
  ctx.font = "bold 24px Sans";
  ctx.textAlign = "center";
  ctx.fillStyle = bgColorPrimary;

  ctx.lineWidth = 4;
  ctx.strokeStyle = textColor;
  ctx.strokeText(xpText, textX, textY);

  ctx.fillText(xpText, textX, textY);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

export default generateRankCard;
