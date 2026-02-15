
import { IconTrendingDown, IconTrendingUp, IconMinus } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface SectionCardItem {
  title: string
  value: string | number
  trend: number
  trendLabel: string
  footerLabel: string
}

interface SectionCardsProps {
  cards: SectionCardItem[]
}

export function SectionCards({ cards }: SectionCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {cards.map((card, index) => {
        const isPositive = card.trend > 0
        const isNeutral = card.trend === 0
        
        return (
          <Card key={index} className="@container/card">
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {isNeutral ? (
                    <IconMinus className="size-4 text-muted-foreground" />
                  ) : isPositive ? (
                    <IconTrendingUp className="size-4 text-green-500" />
                  ) : (
                    <IconTrendingDown className="size-4 text-red-500" />
                  )}
                  <span className={isNeutral ? "text-muted-foreground" : isPositive ? "text-green-500" : "text-red-500"}>
                    {isNeutral ? "0%" : `${card.trend > 0 ? "+" : ""}${card.trend}%`}
                  </span>
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {card.trendLabel}
                {isNeutral ? null : isPositive ? (
                  <IconTrendingUp className="size-4 text-green-500" />
                ) : (
                  <IconTrendingDown className="size-4 text-red-500" />
                )}
              </div>
              <div className="text-muted-foreground">
                {card.footerLabel}
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
