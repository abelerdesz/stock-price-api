import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { FinnhubQuoteResponse } from './types/finnhub.types';

@Injectable()
export class FinnhubService {
  private readonly logger = new Logger(FinnhubService.name);

  private readonly baseUrl = 'https://finnhub.io/api/v1';

  private readonly token = process.env.FINNHUB_API_TOKEN;

  constructor(private readonly httpService: HttpService) {}

  async getCurrentPriceForStock(symbol: string): Promise<number> {
    await this.throwIfSymbolNotFound(symbol);
    const finnhubResponse = await this.fetchSymbolAndHandleError(symbol);
    return finnhubResponse.c;
  }

  async fetchSymbolAndHandleError(
    symbol: string,
  ): Promise<FinnhubQuoteResponse> {
    const { data } = await firstValueFrom<AxiosResponse<FinnhubQuoteResponse>>(
      this.httpService
        .get<FinnhubQuoteResponse>(
          `${this.baseUrl}/quote?symbol=${symbol}&token=${this.token}`,
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);

            throw new InternalServerErrorException(
              'Error while fetching stock data from Finnhub',
            );
          }),
        ),
    );

    return data;
  }

  async throwIfSymbolNotFound(symbol: string): Promise<void> {
    const finnhubResponse = await this.fetchSymbolAndHandleError(symbol);

    // Finnhub returns 0 for the current price if the symbol is not found
    // It might not be the most elegant way to check for this, but it works for now
    if (finnhubResponse.c === 0) {
      this.logger.error(`Symbol ${symbol} not found on Finnhub.`);
      throw new NotFoundException(`Stock with symbol '${symbol}' not found`);
    }

    return;
  }
}
